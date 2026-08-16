import { initializeApp } from "firebase/app";

// PRD 06절 지침: 이번 단계는 SDK 초기화까지만 진행하고, 화면은 계속
// src/mock/store.ts의 mock 데이터로 동작한다. Firestore/Auth 연동은
// 이 app 인스턴스를 기반으로 다음 단계에서 붙인다.
const firebaseConfig = {
  apiKey: "AIzaSyA1yiemZ6QfTobIq4-MBglKLpbOfiJOD88",
  authDomain: "kanban-firebase-f32d8.firebaseapp.com",
  projectId: "kanban-firebase-f32d8",
  storageBucket: "kanban-firebase-f32d8.firebasestorage.app",
  messagingSenderId: "483399169757",
  appId: "1:483399169757:web:dadf5b53de756f9b2a8d34",
};

export const firebaseApp = initializeApp(firebaseConfig);
