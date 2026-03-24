import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "dummy-api-key",
  authDomain: "dummy-auth-domain",
  projectId: "dummy-project-id",
  storageBucket: "dummy-storage-bucket",
  messagingSenderId: "dummy-messaging-sender-id",
  appId: "dummy-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
