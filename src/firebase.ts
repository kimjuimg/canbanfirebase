import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 웹 앱의 Firebase 설정값은 비밀이 아니다(클라이언트 번들에 그대로 실린다).
// 실제 접근 제어는 전적으로 Firestore 보안 규칙이 담당하므로, 규칙 작성 전까지는
// 이 프로젝트의 데이터가 사실상 공개 상태라는 점을 전제로 다뤄야 한다.
const firebaseConfig = {
  apiKey: "AIzaSyA1yiemZ6QfTobIq4-MBglKLpbOfiJOD88",
  authDomain: "kanban-firebase-f32d8.firebaseapp.com",
  projectId: "kanban-firebase-f32d8",
  storageBucket: "kanban-firebase-f32d8.firebasestorage.app",
  messagingSenderId: "483399169757",
  appId: "1:483399169757:web:dadf5b53de756f9b2a8d34",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
