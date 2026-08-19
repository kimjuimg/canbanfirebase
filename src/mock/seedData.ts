import type {
  CardRecord,
  ChatMessage,
  ClassRoom,
  ListColumn,
  Profile,
} from "../types";

export const SEED_PROFILES: Profile[] = [
  { id: "teacher-1", displayName: "김선생", role: "teacher", classId: "class-1" },
  { id: "student-1", displayName: "이지훈", role: "student", classId: "class-1" },
  { id: "student-2", displayName: "박서연", role: "student", classId: "class-1" },
  // 아직 학급에 가입하지 않은 학생 계정. 이 계정으로 전환하면 가입코드 입력
  // 화면(OnboardingScreen)부터 시작해, 학생의 최초 참여 흐름을 실습할 수 있다.
  { id: "student-3", displayName: "최민준", role: "student", classId: null },
];

export const SEED_CLASSES: ClassRoom[] = [
  {
    id: "class-1",
    name: "3학년 2반",
    joinCode: "MATH302",
    teacherId: "teacher-1",
    schedule: [
      { id: "sch-1", day: "월", period: 1, subject: "수학" },
      { id: "sch-2", day: "월", period: 2, subject: "국어" },
      { id: "sch-3", day: "수", period: 3, subject: "과학" },
    ],
  },
];

export const SEED_LISTS: ListColumn[] = [
  { id: "list-announce-1", classId: "class-1", ownerId: "announcement", title: "이번 주 공지", order: 0 },
  { id: "list-announce-2", classId: "class-1", ownerId: "announcement", title: "제출 확인", order: 1 },
  { id: "list-student1-1", classId: "class-1", ownerId: "student-1", title: "할 일", order: 0 },
  { id: "list-student1-2", classId: "class-1", ownerId: "student-1", title: "완료", order: 1 },
  { id: "list-student2-1", classId: "class-1", ownerId: "student-2", title: "할 일", order: 0 },
  { id: "list-student2-2", classId: "class-1", ownerId: "student-2", title: "완료", order: 1 },
];

export const SEED_CARDS: CardRecord[] = [
  {
    id: "card-1",
    listId: "list-announce-1",
    title: "수행평가 안내",
    content: "다음 주 금요일까지 독서 감상문 제출하세요.",
    order: 0,
    isPublic: true,
    createdBy: "teacher-1",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: "card-2",
    listId: "list-announce-1",
    title: "현장학습 초안 (비공개)",
    content: "다음 달 현장학습 장소 후보 정리 중.",
    order: 1,
    isPublic: false,
    createdBy: "teacher-1",
    createdAt: Date.now() - 1000 * 60 * 30,
  },
  {
    id: "card-3",
    listId: "list-student1-1",
    title: "수학 문제집 3단원",
    content: "오늘 저녁까지 풀기",
    order: 0,
    isPublic: true,
    createdBy: "student-1",
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    id: "card-4",
    listId: "list-student1-2",
    title: "독서록 작성",
    content: "완료함",
    order: 0,
    isPublic: true,
    createdBy: "student-1",
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
  },
];

export const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    classId: "class-1",
    senderId: "teacher-1",
    senderName: "김선생",
    senderRole: "teacher",
    content: "다들 안녕하세요! 여기는 우리 반 전체 채팅방이에요.",
    createdAt: Date.now() - 1000 * 60 * 40,
  },
  {
    id: "msg-2",
    classId: "class-1",
    senderId: "student-1",
    senderName: "이지훈",
    senderRole: "student",
    content: "안녕하세요 선생님!",
    createdAt: Date.now() - 1000 * 60 * 38,
  },
];
