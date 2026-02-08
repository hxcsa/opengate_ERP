import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDTh-Aofi45HkM67dA-cFQMLbALwuST2Ms",
    authDomain: "grinders-7e982.firebaseapp.com",
    projectId: "grinders-7e982",
    storageBucket: "grinders-7e982.firebasestorage.app",
    messagingSenderId: "117713597425",
    appId: "1:117713597425:web:b14d6d1d8108ae61dd4a50",
    measurementId: "G-GZPQL7Q845"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export default app;
