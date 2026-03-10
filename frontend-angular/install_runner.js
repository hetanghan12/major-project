const { execSync } = require('child_process');
const fs = require('fs');
try {
    console.log('Starting npm install...');
    const output = execSync('npm install chart.js ng2-charts --legacy-peer-deps', { encoding: 'utf-8', stdio: 'pipe' });
    fs.writeFileSync('install_output.log', output);
    console.log('Finished successfully.');
} catch (error) {
    fs.writeFileSync('install_error.log', error.stdout + '\n\n' + error.stderr);
    console.log('Failed. Check install_error.log');
}
