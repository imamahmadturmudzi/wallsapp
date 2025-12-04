// Import fungsi yang dibutuhkan dari SDK
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Konfigurasi Firebase Anda
// NANTI KITA ISI BAGIAN INI DENGAN KODE DARI CONSOLE GOOGLE
const firebaseConfig = {
  apiKey: "AIzaSyA1JJKDDJ33SbvloJ5gl4hVgDbqSV9e_ns",
  authDomain: "wallsapp-4c97e.firebaseapp.com",
  projectId: "wallsapp-4c97e",
  storageBucket: "wallsapp-4c97e.firebasestorage.app",
  messagingSenderId: "726539284168",
  appId: "1:726539284168:web:0c9a1d8587872b8ba93ffd"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Export database agar bisa dipanggil di halaman lain
export const db = getFirestore(app);
export const auth = getAuth(app);