# Fix Upload Open/Verify Issues

## Steps:
- [x] 1. Understand files (done: routes/uploads.js, models/Upload.js, frontends, server.js, aiVerifier.js)
- [x] 2. Create this TODO.md
- [x] 3. Edit frontend/student-dashboard.html: Fix render logic, status-aware buttons, click handlers, load error/retry (complete)
- [x] 4. Improve utils/aiVerifier.js: Lenient fallback, better scoring for common academic files
- [x] 5. Tweak routes/uploads.js: Ensure fileUrl always set, added logging
- [x] 6. Test: restart server (`npm start`), visit http://localhost:5000/frontend/student-dashboard.html, login, upload test file, refresh dashboard – now shows data with status badges, working Open/Download buttons
- [x] 7. attempt_completion

