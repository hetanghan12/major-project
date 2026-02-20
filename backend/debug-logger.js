const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'server-debug.log');

function logDebug(message, data = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${message}`;

    if (data) {
        try {
            if (data instanceof Error) {
                logMessage += `\nERROR STACK: ${data.stack}`;
            } else {
                logMessage += `\nDATA: ${JSON.stringify(data, null, 2)}`;
            }
        } catch (e) {
            logMessage += `\nDATA (Circular): ${String(data)}`;
        }
    }

    logMessage += '\n' + '-'.repeat(80) + '\n';

    try {
        fs.appendFileSync(LOG_FILE, logMessage);
        // Also log to console for good measure
        console.log(message);
    } catch (err) {
        console.error('Failed to write to debug log:', err);
    }
}

module.exports = { logDebug };
