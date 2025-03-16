import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDe3t8SatIduu2JDFXXENG0A6etxYgGolA",
  authDomain: "horizen-51b4b.firebaseapp.com",
  projectId: "horizen-51b4b",
  storageBucket: "horizen-51b4b.appspot.com",
  messagingSenderId: "21600974319",
  appId: "1:21600974319:web:2b5a4b01f045f167b5721a",
};

let appInstance = null;
let dbInstance = null;
let authInstance = null;

// Initialize Firebase app lazily
const getFirebaseApp = () => {
  if (!appInstance) {
    try {
      appInstance = initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Failed to initialize Firebase app:", error);
      throw error;
    }
  }
  return appInstance;
};

// Initialize Firestore lazily
export const getDb = () => {
  if (!dbInstance) {
    const app = getFirebaseApp();
    try {
      dbInstance = getFirestore(app); 
    } catch (error) {
      console.error("Failed to initialize Firestore:", error);
      throw error;
    }
  }
  return dbInstance;
};

// Initialize Firebase Authentication lazily
export const getAuthInstance = () => {
  if (!authInstance) {
    const app = getFirebaseApp();
    try {
      authInstance = getAuth(app);
    } catch (error) {
      console.error("Failed to initialize Firebase Authentication:", error);
      throw error;
    }
  }
  return authInstance;
};

export const db = getDb();
export const auth = getAuthInstance();
