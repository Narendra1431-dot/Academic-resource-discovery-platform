require('dotenv').config();
const mongoose = require('mongoose');

const Branch = require('../models/Branch');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');

(async function run() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const BRANCHES = [
      { key: 'CSE', name: 'Computer Science (CSE)', room: 'CS', faculty: ['Dr. Kumar','Dr. Sharma','Prof. Mehta','Dr. Gupta','Prof. Nair','Dr. Reddy','Dr. Bhatia','Prof. Chawla','Dr. Sethi','Prof. Tiwari'] },
      { key: 'ECE', name: 'Electronics (ECE)', room: 'EC', faculty: ['Dr. Rao','Dr. Iyer','Prof. Subramanian','Dr. Menon','Prof. Bose','Dr. Khanna','Dr. Ramaswamy','Prof. Krishnan','Dr. Pillai'] },
      { key: 'Civil', name: 'Civil', room: 'CV', faculty: ['Dr. Verma','Prof. Agrawal','Dr. Singh','Prof. Patil','Dr. Chandra','Dr. Kapoor','Prof. Jadhav','Dr. Bansal'] },
      { key: 'Mechanical', name: 'Mechanical', room: 'ME', faculty: ['Dr. Pawar','Prof. Kulkarni','Dr. Joshi','Prof. Desai','Dr. Sawant','Dr. Patwardhan','Prof. Rao'] },
      { key: 'IT', name: 'Information Technology (IT)', room: 'IT', faculty: ['Dr. Sinha','Prof. Banerjee','Dr. Ghosh','Prof. Mukherjee','Dr. Das','Dr. Roy','Prof. Sengupta'] }
    ];

    const DAYS = ['Mon','Tue','Wed','Thu','Fri'];
    const SLOTS = [
      '9:00-10:30',
      '10:30-12:00',
      '12:00-1:30',
      '2:00-3:30',
      '3:30-5:00'
    ];

    const [dbBranches, dbSemesters] = await Promise.all([
      Branch.find({}),
      Semester.find({})
    ]);

    // Canonical 7-subject sets per semester (5 theory + 2 labs typical)
    const CANON = {
      1: ['Engineering Mathematics I','Engineering Physics','Engineering Chemistry','Engineering Drawing','Basic Electrical Engineering','Physics Lab','Chemistry Lab'],
      2: ['Mathematics II','Programming in C','Engineering Mechanics','Environmental Science','Workshop Practice','C Programming Lab','Engineering Mechanics Lab'],
      3: ['Data Structures','Digital Logic Design','Discrete Mathematics','Computer Organization','Object Oriented Programming','Data Structures Lab','OOP Lab'],
      4: ['Operating Systems','Database Management Systems','Software Engineering','Computer Networks','Microprocessors','OS Lab','DBMS Lab'],
      5: ['Compiler Design','Theory of Computation','Artificial Intelligence','Machine Learning','Computer Networks Lab','AI Lab','ML Lab'],
      6: ['Cloud Computing','Distributed Systems','Web Technologies','Information Security','Computer Graphics','Web Tech Lab','CG Lab'],
      7: ['Big Data Analytics','Internet of Things','Mobile Application Development','Data Mining','Project Work I','IoT Lab','Mobile App Lab'],
      8: ['Deep Learning','Blockchain Technology','Cyber Security','Project Work II','Seminar','Deep Learning Lab','Cyber Security Lab']
    };

    function getBranchDoc(name) {
      const b = dbBranches.find(x => x.name === name);
      if (!b) throw new Error(`Branch not found in DB: ${name}`);
      return b;
    }
    function getSemesterDoc(num) {
      const s = dbSemesters.find(x => x.number === num);
      if (!s) throw new Error(`Semester not found in DB: ${num}`);
      return s;
    }

    function inferType(subjName) {
      const n = (subjName || '').toLowerCase();
      if (n.includes('lab') || n.includes('project') || n.includes('workshop') || n.includes('practical')) return 'lab';
      return 'theory';
    }

    let total = 0;

    for (const b of BRANCHES) {
      const bDoc = getBranchDoc(b.name);
      for (let semNumber = 1; semNumber <= 8; semNumber++) {
        const sDoc = getSemesterDoc(semNumber);
        const dbSubjects = await Subject.find({ branchId: bDoc._id, semesterId: sDoc._id }).select('name').lean();
        // Build a 7-subject pool: prefer DB subjects; fill remainder from canonical
        const pool = [];
        const seen = new Set();
        for (const s of dbSubjects) {
          if (!seen.has(s.name) && pool.length < 7) { pool.push(s.name); seen.add(s.name); }
        }
        const canon = CANON[semNumber] || [];
        for (const s of canon) {
          if (!seen.has(s) && pool.length < 7) { pool.push(s); seen.add(s); }
        }
        // If still < 7, extend with canon repeats
        let ci = 0;
        while (pool.length < 7 && canon.length) { pool.push(canon[ci++ % canon.length]); }

        if (!pool.length) {
          console.warn(`[warn] No subject pool for ${b.name} sem ${semNumber}. Skipping.`);
          continue;
        }

        console.log(`Generating plan for ${b.key} (DB:"${b.name}") Semester ${semNumber} with ${pool.length} subjects (7-target)...`);

        await Timetable.deleteMany({ branchId: bDoc._id, semesterId: sDoc._id, studentId: { $exists: false } });

        const entries = [];
        let index = 0;
        for (let di = 0; di < DAYS.length; di++) {
          for (let ti = 0; ti < SLOTS.length; ti++) {
            const subj = pool[index % pool.length];
            const faculty = b.faculty[(di * SLOTS.length + ti) % b.faculty.length];
            const room = `${b.room}${semNumber}${(di+1)}${(ti+1)}`;
            entries.push({
              branchId: bDoc._id,
              semesterId: sDoc._id,
              semesterNumber: semNumber,
              day: DAYS[di],
              timeSlot: SLOTS[ti],
              time: SLOTS[ti],
              subject: subj,
              room,
              faculty,
              type: inferType(subj)
            });
            index++;
          }
        }

        if (entries.length) {
          await Timetable.insertMany(entries);
          total += entries.length;
          console.log(`✔ Inserted ${entries.length} entries for ${b.key} Sem ${semNumber}`);
        }
      }
    }

    console.log(`\n✅ Completed timetable seeding. Inserted ${total} records.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding timetable:', err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
})();
