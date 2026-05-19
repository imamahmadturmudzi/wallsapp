// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 1. Masukkan konfigurasi Firebase Anda di sini
firebase.initializeApp({
  apiKey: "AIzaSyA1JJKDDJ33SbvloJ5gl4hVgDbqSV9e_ns",
  authDomain: "wallsapp-4c97e.firebaseapp.com",
  projectId: "wallsapp-4c97e",
  storageBucket: "wallsapp-4c97e.firebasestorage.app",
  messagingSenderId: "726539284168",
  appId: "1:726539284168:web:0c9a1d8587872b8ba93ffd"
});

const messaging = firebase.messaging();

// 2. Event saat pesan diterima di latar belakang (saat aplikasi tertutup)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Pesan diterima:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Pastikan file logo Anda ada di folder public
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});