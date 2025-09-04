// firebase-init.js

// 1. Config primeiro!
const firebaseConfig = {
  apiKey: "AIzaSyAWXyyg8qbIrPfbC7KVC6suZwCQt9Upbt0",
  authDomain: "landin-paulo.firebaseapp.com",
  projectId: "landin-paulo",
  storageBucket: "landin-paulo.appspot.com",
  messagingSenderId: "461136266735",
  appId: "1:461136266735:web:f1778bd0d47d468e35e21a",
  measurementId: "G-DC93K1PPPT"
};

// 2. Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// 3. Inicializa o app
const app = initializeApp(firebaseConfig);

// 4. Exporta os serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
