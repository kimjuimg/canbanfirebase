// Firestore 연동을 전제로 한 정규화된 데이터 모델.
// 실제 연동 시 각 타입은 그대로 컬렉션 문서 스키마로 옮겨진다.

export type Role = "teacher" | "student";

export interface Profile {
  id: string;
  displayName: string;
  role: Role;
  classId: string | null;
}

export type Weekday = "월" | "화" | "수" | "목" | "금";

export interface ScheduleSlot {
  id: string;
  day: Weekday;
  period: number;
  subject: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  joinCode: string;
  teacherId: string;
  schedule: ScheduleSlot[];
}

/** 'announcement' = 교사 공지 보드, 그 외 값은 해당 학생(profileId)의 개인 보드 */
export type BoardOwner = "announcement" | string;

export interface ListColumn {
  id: string;
  classId: string;
  ownerId: BoardOwner;
  title: string;
  order: number;
}

export interface CardRecord {
  id: string;
  listId: string;
  title: string;
  content: string;
  order: number;
  /** 공지 보드 카드에서만 의미 있음. 개인 보드 카드는 항상 작성자+교사만 열람 가능. */
  isPublic: boolean;
  createdBy: string;
  createdAt: number;
}
