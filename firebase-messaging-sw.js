importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyC69al0BNfnnMm7tzBTcnch5VdrhUugYtA",
    authDomain: "w2a-37531-672997.firebaseapp.com",
    projectId: "w2a-37531-672997",
    storageBucket: "w2a-37531-672997.firebasestorage.app",
    messagingSenderId: "515898424721",
    appId: "1:515898424721:web:f9d4d842bc621db2da6e30"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title || "تنبيه EIDCO OS";
    const notificationOptions = {
        body: payload.notification.body || "",
        icon: "/assets/icon.png"
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
