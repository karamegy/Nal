import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC69al0BNfnnMm7tzBTcnch5VdrhUugYtA",
  authDomain: "w2a-37531-672997.firebaseapp.com",
  projectId: "w2a-37531-672997",
  storageBucket: "w2a-37531-672997.firebasestorage.app",
  messagingSenderId: "515898424721",
  appId: "1:515898424721:web:f9d4d842bc621db2da6e30"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
