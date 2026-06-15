// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDutYg4rrJHd492-EZQs1IfifFCyCd-pM",
  authDomain: "pawan-1-dfc6d.firebaseapp.com",
  databaseURL: "https://pawan-1-dfc6d-default-rtdb.firebaseio.com",
  projectId: "pawan-1-dfc6d",
  storageBucket: "pawan-1-dfc6d.firebasestorage.app",
  messagingSenderId: "728797429341",
  appId: "1:728797429341:web:d8297bca7a70d3c57697b4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

