const { getAuth, getFirestore } = require('./config/firebase.config');
require('dotenv').config();

const { initializeFirebase } = require('./config/firebase.config');
initializeFirebase();

async function test() {
    const firestore = getFirestore();
    try {
        const snap = await firestore.collection('documents').limit(1).get();
        if (snap.empty) {
            console.log('No documents collection.');
        } else {
            console.log('Sample Document:', snap.docs[0].id, snap.docs[0].data());
        }
    } catch (e) {
        console.error(e);
    }
}
test();
