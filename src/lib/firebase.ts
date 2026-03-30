import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD5sZwPeTvF1YP7hP-JayeuO3Y0kQ7Ajdc",
  authDomain: "draftroom-49b17.firebaseapp.com",
  projectId: "draftroom-49b17",
  storageBucket: "draftroom-49b17.firebasestorage.app",
  messagingSenderId: "272272152899",
  appId: "1:272272152899:web:b995e6192933cc06f077f6",
  measurementId: "G-7T8MCNVMV7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
