import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import { doc, getDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.sanMarcoStoreReady = (async () => {
    const snapshot = await getDoc(doc(db, 'site', 'content'));
    return snapshot.exists() ? snapshot.data() : null;
})().catch((error) => {
    console.error('No se pudo cargar el contenido de Firebase:', error);
    return null;
});
