import {initializeApp} from "firebase/app";
import {getFirestore} from "firebase/firestore";
export const firebaseConfig={
  "apiKey": "AIzaSyCTzZtaO4eQ7S2kXMBhXChkgMdcCZOm7mU",
  "authDomain": "a-m-c-a59b4.firebaseapp.com",
  "projectId": "a-m-c-a59b4",
  "storageBucket": "a-m-c-a59b4.firebasestorage.app",
  "appId": "1:45607225116:android:469e3ff5e918dfbd345cd9"
};
export const app=initializeApp(firebaseConfig);
export const db=getFirestore(app);
