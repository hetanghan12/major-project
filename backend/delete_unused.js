const fs = require('fs');
const path = require('path');

const filesToDelete = [
    'services/storage.service.js',
    'controllers/document.controller.js',
    'routes/document.routes.js',
    'test-all-responses.js',
    'test-get.js',
    'test-public-s3.js',
    'test-queue.js',
    'test-real-http.js',
    'test-real-response.js',
    'test-render.js',
    'test-running-api.js',
    'test-user-docs-2.js',
    'test-user-docs.js',
    'debug-logger.js'
];

filesToDelete.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Deleted: ' + file);
    } else {
        console.log('Not found: ' + file);
    }
});
console.log('Done');
