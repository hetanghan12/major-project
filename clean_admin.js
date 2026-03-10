const fs = require('fs');
const path = require('path');

const projectRoot = 'e:/end last';
const filesToDelete = [
    'backend/routes/admin.routes.js',
    'backend/controllers/admin.controller.js',
    'frontend-angular/src/app/core/guards/admin.guard.ts',
    'frontend-angular/src/app/core/services/admin.service.ts',
    'delete_admin_files.js'
];

filesToDelete.forEach(f => {
    const fullPath = path.join(projectRoot, f);
    try {
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`Successfully deleted: ${fullPath}`);
        } else {
            console.log(`File does not exist: ${fullPath}`);
        }
    } catch (err) {
        console.error(`Error deleting ${fullPath}: ${err.message}`);
    }
});
