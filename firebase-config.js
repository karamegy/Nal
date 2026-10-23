import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, 
    signInAnonymously, 
    setPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC69al0BNfnnMm7tzBTcnch5VdrhUugYtA",
  authDomain: "w2a-37531-672997.firebaseapp.com",
  projectId: "w2a-37531-672997",
  storageBucket: "w2a-37531-672997.firebasestorage.app",
  messagingSenderId: "515898424721",
  appId: "1:515898424721:web:f9d4d842bc621db2da6e30"
};

// 1. تهيئة تطبيق Firebase
export const app = initializeApp(firebaseConfig);

// 2. تهيئة قواعد البيانات Firestore مع دعم التخزين المحلي والمزامنة متعددة التبويبات أوفلاين
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// 3. تهيئة المصادقة مع حفظ الجلسة محلياً لاستمرار الاتصال داخل WebView / Capacitor
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    if (!auth.currentUser) {
      return signInAnonymously(auth);
    }
  })
  .catch((err) => {
    console.warn("EIDCO Auth Warning:", err.message);
  });
