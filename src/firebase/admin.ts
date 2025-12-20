import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

let adminApp: App;

if (!getApps().length) {
  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // This will work in Firebase/Google Cloud environments
    console.warn("Firebase Admin SDK service account not found, attempting to initialize with default credentials. This is expected in a Google Cloud environment.");
    adminApp = initializeApp();
  }
} else {
  adminApp = getApps()[0];
}


const firestore = getFirestore(adminApp);
const auth = getAuth(adminApp);

export function getFirebaseAdmin() {
    return {
        firestore,
        auth,
        app: adminApp
    }
}
