const fs = require('fs');
const paths = [
    'e:/end last/backend/routes/admin.routes.js',
    'e:/end last/backend/controllers/admin.controller.js',
    'e:/end last/frontend-angular/src/app/core/guards/admin.guard.ts',
    'e:/end last/frontend-angular/src/app/core/services/admin.service.ts'
];

paths.forEach(p => {
    try {
        if (fs.existsSync(p)) {
            fs.unlinkSync(p);
            console.log(`Deleted: ${p}`);
        } else {
            console.log(`Not found: ${p}`);
        }
    } catch (err) {
        console.error(`Error deleting ${p}: ${err.message}`);
    }
});
