// ─────────────────────────────────────────────────────────────
// js/firebase-config.example.js — ต้นแบบไฟล์เชื่อมต่อ Firestore
// คัดลอกไฟล์นี้เป็น js/firebase-config.js (ไฟล์นั้นถูกกันไว้ใน .gitignore แล้ว)
// แล้วใส่ค่า config จริงจาก Firebase Console ของโปรเจกต์คุณเอง
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
