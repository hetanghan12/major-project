const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/secure/documents/123/copy',
    method: 'POST',
}, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${body}`);
    });
});
req.on('error', e => console.error(e));
req.end();
