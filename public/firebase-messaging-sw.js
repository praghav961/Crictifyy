importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "astute-almanac-xt8c4",
  appId: "1:619099882330:web:88e9a39529d53637d6e963",
  apiKey: "AIzaSyB9HTZomtpe1i-tDHqGaN4RYBGs44DPhPU",
  authDomain: "astute-almanac-xt8c4.firebaseapp.com",
  storageBucket: "astute-almanac-xt8c4.firebasestorage.app",
  messagingSenderId: "619099882330"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'CRICTIFY';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
