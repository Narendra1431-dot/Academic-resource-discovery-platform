require('dotenv').config();
const mongoose = require('mongoose');

const Branch = require('./models/Branch');
const Semester = require('./models/Semester');
const Subject = require('./models/Subject');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Seeding database with full coverage (8 semesters x all branches)...');

    // Clear existing data
    await Branch.deleteMany({});
    await Semester.deleteMany({});
    await Subject.deleteMany({});
    await User.deleteMany({});

    // Branches
    const branches = await Branch.insertMany([
      { name: 'Computer Science (CSE)' },
      { name: 'Information Technology (IT)' },
      { name: 'Electronics (ECE)' },
      { name: 'Electrical (EEE)' },
      { name: 'Mechanical' },
      { name: 'Civil' }
    ]);

    // Semesters
    const semesters = await Semester.insertMany([
      { number: 1, year: 1 }, { number: 2, year: 1 },
      { number: 3, year: 2 }, { number: 4, year: 2 },
      { number: 5, year: 3 }, { number: 6, year: 3 },
      { number: 7, year: 4 }, { number: 8, year: 4 }
    ]);

    const timeSlots = [
      '9:00-10:30 AM',
      '10:30-12:00 PM',
      '11:00-12:30 PM',
      '2:00-3:30 PM',
      '3:30-5:00 PM'
    ];

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const allSubjectsToInsert = [];

    // Helper to add a subject with some slots
    function createSubject(name, branchIdx, semIdx, numSlots = 2) {
      const branchId = branches[branchIdx]._id;
      const semesterId = semesters[semIdx]._id;
      const year = semesters[semIdx].year;
      
      const slots = [];
      const usedCombos = new Set();
      
      for(let i=0; i<numSlots; i++) {
        let day, time;
        let attempts = 0;
        do {
          day = days[Math.floor(Math.random() * days.length)];
          time = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          attempts++;
        } while(usedCombos.has(`${day}-${time}`) && attempts < 20);
        
        usedCombos.add(`${day}-${time}`);
        slots.push({
          day,
          time,
          room: `${branches[branchIdx].name.substring(0,1)}${semIdx+1}0${i+1}`,
          type: Math.random() > 0.8 ? 'lab' : 'theory'
        });
      }

      return {
        name,
        branchId,
        semesterId,
        year,
        timetableSlots: slots
      };
    }

    // Branch specific subject templates
    const templates = {
      'Computer Science (CSE)': [
        ['Math I', 'Physics', 'Programming in C', 'Engineering Graphics'], // Sem 1
        ['Math II', 'Chemistry', 'Data Structures', 'Basic Electronics'], // Sem 2
        ['Discrete Math', 'Digital Logic', 'Computer Org', 'Java Programming'], // Sem 3
        ['Operating Systems', 'DBMS', 'Algorithms', 'Theory of Computation'], // Sem 4
        ['Computer Networks', 'Software Eng', 'Microprocessors', 'Web Tech'], // Sem 5
        ['Artificial Intelligence', 'Compiler Design', 'Information Security', 'ML'], // Sem 6
        ['Distributed Systems', 'Cloud Computing', 'Data Mining', 'Big Data'], // Sem 7
        ['Deep Learning', 'Internet of Things', 'Cyber Security', 'Real-time Systems'] // Sem 8
      ],
      'Information Technology (IT)': [
        ['Math I', 'Physics', 'Programming in C', 'IT Essentials'], // Sem 1
        ['Math II', 'Chemistry', 'Data Structures', 'Web Basics'], // Sem 2
        ['Computer Architecture', 'Digital Logic', 'OOP with Java', 'Stat Methods'], // Sem 3
        ['Operating Systems', 'Database Systems', 'Software Eng', 'Communication'], // Sem 4
        ['Computer Networks', 'Web Technologies', 'Cloud foundations', 'ERP Systems'], // Sem 5
        ['Mobile Apps', 'Information Security', 'Data Science', 'Human Computer Interaction'], // Sem 6
        ['Big Data Analytics', 'E-Commerce', 'Network Security', 'Business Intelligence'], // Sem 7
        ['Advanced Web Technologies', 'IT Governance', 'Blockchain', 'Social Media Analytics'] // Sem 8
      ],
      'Electronics (ECE)': [
        ['Math I', 'Physics', 'Basic Electrical', 'Programming in C'], // Sem 1
        ['Math II', 'Chemistry', 'Circuit Theory', 'Eng Drawing'], // Sem 2
        ['Electronic Devices', 'Digital Electronics', 'Network Analysis', 'Signals & Systems'], // Sem 3
        ['Analog Circuits', 'Microprocessors', 'Electromagnetic Fields', 'Control Systems'], // Sem 4
        ['Digital Signal Processing', 'Microcontrollers', 'Communication Systems', 'VLSI Design'], // Sem 5
        ['Antenna & Propagation', 'Digital Communication', 'Embedded Systems', 'Optical Comm'], // Sem 6
        ['Wireless Comm', 'VLSI Systems on Chip', 'RF Design', 'Satellite Comm'], // Sem 7
        ['Robotics', 'MEMS', 'Power Electronics', 'Mixed Signal Design'] // Sem 8
      ],
      'Electrical (EEE)': [
        ['Math I', 'Physics', 'Programming', 'Eng Mechanics'], // Sem 1
        ['Math II', 'Chemistry', 'Electric Circuits', 'Basic Electronics'], // Sem 2
        ['Electrical Machines I', 'Network Theory', 'Field Theory', 'Digital Logic'], // Sem 3
        ['Electrical Machines II', 'Control Systems', 'Power Systems I', 'Measurements'], // Sem 4
        ['Power Systems II', 'Power Electronics', 'Applied Electronics', 'Signals & Systems'], // Sem 5
        ['Microprocessors', 'Digital Signal Processing', 'Power System Protection', 'Drives'], // Sem 6
        ['HVDC Systems', 'FACTS Controllers', 'Power Quality', 'Smart Grid'], // Sem 7
        ['Restructured Power Systems', 'Renewable Energy', 'Machine Learning in Power', 'E-Vehicles'] // Sem 8
      ],
      'Mechanical': [
        ['Math I', 'Physics', 'Workshop Practice', 'Eng Drawing'], // Sem 1
        ['Math II', 'Chemistry', 'Eng Mechanics', 'Material Science'], // Sem 2
        ['Thermodynamics', 'Strength of Materials', 'Fluid Mechanics', 'Manufac Processes'], // Sem 3
        ['Applied Thermo', 'Dynamics of Machinery', 'Machine Design I', 'Kinematics'], // Sem 4
        ['Heat Transfer', 'Machine Design II', 'Metrology', 'Hydraulics'], // Sem 5
        ['Inernal Combustion Engines', 'CAD/CAM', 'Mechatronics', 'Turbo Machines'], // Sem 6
        ['Finite Element Analysis', 'Operations Research', 'Power Plant Eng', 'Automobile Eng'], // Sem 7
        ['Robotics', 'Refrigeration & AC', 'Industrial Eng', 'Renewable Energy'] // Sem 8
      ],
      'Civil': [
        ['Math I', 'Physics', 'Eng Mechanics', 'Eng Drawing'], // Sem 1
        ['Math II', 'Chemistry', 'Surveying I', 'Building Materials'], // Sem 2
        ['Strength of Materials', 'Fluid Mechanics', 'Surveying II', 'Building Planning'], // Sem 3
        ['Structural Analysis I', 'Concrete Tech', 'Hydrology', 'Soil Mechanics'], // Sem 4
        ['Structural Analysis II', 'Geotechnical Eng', 'Transportation Eng', 'Irrigation'], // Sem 5
        ['Design of Steel Structures', 'Environmental Eng I', 'Foundation Eng', 'Estimating'], // Sem 6
        ['Design of RCC Structures', 'Environmental Eng II', 'Construction Mgmt', 'Railways'], // Sem 7
        ['Prestressed Concrete', 'Bridge Engineering', 'Earthquake Resistent Design', 'Urban Planning'] // Sem 8
      ]
    };

    // Populate allSubjectsToInsert using templates
    branches.forEach((branch, bIdx) => {
      const branchName = branch.name;
      const semSubjects = templates[branchName];
      if (semSubjects) {
        semSubjects.forEach((subjects, sIdx) => {
          subjects.forEach(subName => {
            allSubjectsToInsert.push(createSubject(subName, bIdx, sIdx));
          });
        });
      }
    });

    console.log(`✅ Generating ${allSubjectsToInsert.length} subjects (full matrix: ${branches.length} branches x 8 semesters)...`);
    await Subject.insertMany(allSubjectsToInsert);

    // Demo users
    const adminPass = await bcrypt.hash('admin123', 12);
    const studentPass = await bcrypt.hash('student123', 12);
    
    await User.insertMany([
      {
        name: 'Admin User',
        email: 'admin@smartacademic.com',
        password: adminPass,
        role: 'admin',
        branchId: branches[0]._id,
        year: 4,
        semesterId: semesters[6]._id
      },
      {
        name: 'Jane CSE Student',
        email: 'jane@student.com',
        password: studentPass,
        role: 'student',
        branchId: branches[0]._id,
        year: 2,
        semesterId: semesters[3]._id
      },
      {
        name: 'IT Student',
        email: 'it@student.com',
        password: studentPass,
        role: 'student',
        branchId: branches[1]._id,
        year: 2,
        semesterId: semesters[2]._id
      },
      {
        name: 'Mech Student',
        email: 'mech@student.com',
        password: studentPass,
        role: 'student',
        branchId: branches[4]._id,
        year: 3,
        semesterId: semesters[4]._id
      }
    ]);

    console.log('✅ Database seeded with full timetable data!');
    console.log('Branches: 6, Semesters: 8, Total Subjects: ' + allSubjectsToInsert.length);
    console.log('Quick access:');
    console.log('- CSE Student: jane@student.com / student123 (Sem 4)');
    console.log('- IT Student: it@student.com / student123 (Sem 3)');
    console.log('- Mech Student: mech@student.com / student123 (Sem 5)');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
