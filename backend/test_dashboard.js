const { getDashboardStats } = require('./controllers/admin.controller');
const { initializeFirebase } = require('./config/firebase.config');

require('dotenv').config();
initializeFirebase();

async function run() {
    const req = { query: {} };
    const res = {
        status: (code) => res,
        json: (data) => console.log(JSON.stringify(data, null, 2))
    };
    await getDashboardStats(req, res);
}
run();
