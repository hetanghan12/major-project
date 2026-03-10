const { initializeFirebase, getAuth, getFirestore } = require('./backend/config/firebase.config');
const fs = require('fs');

async function checkUser(email) {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        initializeFirebase();
        const auth = getAuth();
        const user = await auth.getUserByEmail(email);
        log(`UID: ${user.uid}`);

        const db = getFirestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            log('User Doc Found');
            log(JSON.stringify(userDoc.data(), null, 2));
        } else {
            log('User document does NOT exist in Firestore.');
        }

        const docsSnap = await db.collection('documents').where('userId', '==', user.uid).get();
        log(`Total documents found: ${docsSnap.size}`);

        const trSnap = await db.collection('documents').where('userId', '==', user.uid).where('isTrashed', '==', false).get();
        log(`Live documents: ${trSnap.size}`);

    } catch (e) {
        log('Error: ' + e.message);
    } finally {
        fs.writeFileSync('check_results.txt', output);
    }
}

checkUser('anghanhet1@gmail.com');
