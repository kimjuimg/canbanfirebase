import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";

/**
 * Firestore 보안 규칙 테스트.
 *
 * 이 앱에는 서버가 없어 접근 제어가 전적으로 규칙에 달려 있다(PRD 07절). 규칙을
 * 고칠 때마다 여기서 지켜야 할 불변식을 다시 확인한다. 특히 "학생 간 열람 0건"은
 * PRD의 성공 지표라 회귀가 나면 안 된다.
 */

const CLASS_A = "class-a";
const CLASS_B = "class-b";
const TEACHER = "teacher-a";
const STUDENT_1 = "student-1";
const STUDENT_2 = "student-2";
const OUTSIDER = "outsider";
const OTHER_TEACHER = "teacher-b";

let testEnv: RulesTestEnvironment;

function asUser(uid: string): Firestore {
  return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
}

function asGuest(): Firestore {
  return testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-kanban-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;

    await setDoc(doc(db, "profiles", TEACHER), {
      id: TEACHER,
      displayName: "김선생",
      role: "teacher",
      classId: CLASS_A,
    });
    await setDoc(doc(db, "profiles", STUDENT_1), {
      id: STUDENT_1,
      displayName: "이지훈",
      role: "student",
      classId: CLASS_A,
    });
    await setDoc(doc(db, "profiles", STUDENT_2), {
      id: STUDENT_2,
      displayName: "박서연",
      role: "student",
      classId: CLASS_A,
    });
    await setDoc(doc(db, "profiles", OUTSIDER), {
      id: OUTSIDER,
      displayName: "최민준",
      role: "student",
      classId: null,
    });
    await setDoc(doc(db, "profiles", OTHER_TEACHER), {
      id: OTHER_TEACHER,
      displayName: "박선생",
      role: "teacher",
      classId: CLASS_B,
    });

    await setDoc(doc(db, "classes", CLASS_A), {
      id: CLASS_A,
      name: "3학년 2반",
      joinCode: "MATH302",
      teacherId: TEACHER,
      schedule: [],
    });
    await setDoc(doc(db, "joinCodes", "MATH302"), { classId: CLASS_A, teacherId: TEACHER });

    await setDoc(doc(db, "lists", "list-ann"), {
      id: "list-ann",
      classId: CLASS_A,
      ownerId: "announcement",
      title: "공지",
      order: 0,
    });
    await setDoc(doc(db, "lists", "list-s1"), {
      id: "list-s1",
      classId: CLASS_A,
      ownerId: STUDENT_1,
      title: "할 일",
      order: 0,
    });

    const card = (id: string, ownerId: string, isPublic: boolean, createdBy: string) => ({
      id,
      listId: ownerId === "announcement" ? "list-ann" : "list-s1",
      classId: CLASS_A,
      ownerId,
      title: id,
      content: "",
      order: 0,
      isPublic,
      createdBy,
      createdAt: 1,
    });
    await setDoc(doc(db, "cards", "card-ann-public"), card("card-ann-public", "announcement", true, TEACHER));
    await setDoc(doc(db, "cards", "card-ann-draft"), card("card-ann-draft", "announcement", false, TEACHER));
    await setDoc(doc(db, "cards", "card-s1"), card("card-s1", STUDENT_1, true, STUDENT_1));
    await setDoc(doc(db, "cards", "card-s2"), {
      ...card("card-s2", STUDENT_2, true, STUDENT_2),
      listId: "list-s2",
    });

    await setDoc(doc(db, "messages", "msg-1"), {
      id: "msg-1",
      classId: CLASS_A,
      senderId: TEACHER,
      senderName: "김선생",
      senderRole: "teacher",
      content: "안녕하세요",
      createdAt: 1,
    });
  });
});

describe("학생 개인 기록 비공개 (PRD P0)", () => {
  it("학생은 다른 학생의 카드를 읽을 수 없다", async () => {
    await assertFails(getDoc(doc(asUser(STUDENT_2), "cards", "card-s1")));
  });

  it("학생은 자기 카드를 읽을 수 있다", async () => {
    await assertSucceeds(getDoc(doc(asUser(STUDENT_1), "cards", "card-s1")));
  });

  it("학생은 다른 학생의 리스트를 읽을 수 없다", async () => {
    await assertFails(getDoc(doc(asUser(STUDENT_2), "lists", "list-s1")));
  });

  it("교사는 학급의 모든 학생 카드를 읽을 수 있다", async () => {
    await assertSucceeds(getDoc(doc(asUser(TEACHER), "cards", "card-s1")));
  });

  it("학급 전체 카드를 훑는 쿼리는 학생에게 거부된다", async () => {
    const db = asUser(STUDENT_1);
    await assertFails(getDocs(query(collection(db, "cards"), where("classId", "==", CLASS_A))));
  });

  it("자기 카드로 좁힌 쿼리는 학생에게 허용된다", async () => {
    const db = asUser(STUDENT_1);
    await assertSucceeds(
      getDocs(
        query(collection(db, "cards"), where("classId", "==", CLASS_A), where("ownerId", "==", STUDENT_1)),
      ),
    );
  });
});

describe("공지 초안 비공개", () => {
  it("학생은 교사의 비공개 초안을 읽을 수 없다", async () => {
    await assertFails(getDoc(doc(asUser(STUDENT_1), "cards", "card-ann-draft")));
  });

  it("학생은 공개된 공지를 읽을 수 있다", async () => {
    await assertSucceeds(getDoc(doc(asUser(STUDENT_1), "cards", "card-ann-public")));
  });

  it("학생이 공개 조건 없이 공지를 훑으면 거부된다", async () => {
    const db = asUser(STUDENT_1);
    await assertFails(
      getDocs(
        query(
          collection(db, "cards"),
          where("classId", "==", CLASS_A),
          where("ownerId", "==", "announcement"),
        ),
      ),
    );
  });

  it("학생이 공지를 쓰거나 고칠 수 없다", async () => {
    const db = asUser(STUDENT_1);
    await assertFails(updateDoc(doc(db, "cards", "card-ann-public"), { title: "장난" }));
    await assertFails(deleteDoc(doc(db, "cards", "card-ann-public")));
  });
});

describe("역할 상승 차단 (PRD 03절)", () => {
  it("학생은 자기 role을 teacher로 바꿀 수 없다", async () => {
    await assertFails(updateDoc(doc(asUser(STUDENT_1), "profiles", STUDENT_1), { role: "teacher" }));
  });

  it("학생은 이름은 바꿀 수 있다", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(STUDENT_1), "profiles", STUDENT_1), { displayName: "이지훈2" }),
    );
  });

  it("가입 시 teacher로 프로필을 만들 수 없다", async () => {
    const db = asUser("newbie");
    await assertFails(
      setDoc(doc(db, "profiles", "newbie"), {
        id: "newbie",
        displayName: "신규",
        role: "teacher",
        classId: null,
      }),
    );
  });

  it("가입 시 student 프로필은 만들 수 있다", async () => {
    const db = asUser("newbie");
    await assertSucceeds(
      setDoc(doc(db, "profiles", "newbie"), {
        id: "newbie",
        displayName: "신규",
        role: "student",
        classId: null,
      }),
    );
  });

  it("남의 프로필은 고칠 수 없다", async () => {
    await assertFails(
      updateDoc(doc(asUser(STUDENT_1), "profiles", STUDENT_2), { displayName: "해킹" }),
    );
  });

  it("학생은 학급을 만들 수 없다", async () => {
    const db = asUser(STUDENT_1);
    await assertFails(
      setDoc(doc(db, "classes", "class-new"), {
        id: "class-new",
        name: "가짜 학급",
        joinCode: "AAAAAA",
        teacherId: STUDENT_1,
        schedule: [],
      }),
    );
  });
});

describe("학급 경계", () => {
  it("다른 학급 교사는 이 학급 카드를 읽을 수 없다", async () => {
    await assertFails(getDoc(doc(asUser(OTHER_TEACHER), "cards", "card-s1")));
  });

  it("학급 미배정 사용자는 학급 문서를 읽을 수 없다", async () => {
    await assertFails(getDoc(doc(asUser(OUTSIDER), "classes", CLASS_A)));
  });

  it("담임 교체는 막힌다", async () => {
    await assertFails(
      updateDoc(doc(asUser(TEACHER), "classes", CLASS_A), { teacherId: OTHER_TEACHER }),
    );
  });

  it("가입 코드 변경은 막힌다", async () => {
    await assertFails(updateDoc(doc(asUser(TEACHER), "classes", CLASS_A), { joinCode: "ZZZZZZ" }));
  });

  it("교사는 학급 일정을 고칠 수 있다", async () => {
    await assertSucceeds(
      updateDoc(doc(asUser(TEACHER), "classes", CLASS_A), {
        schedule: [{ id: "s1", day: "월", period: 1, subject: "수학" }],
      }),
    );
  });
});

describe("가입 코드", () => {
  it("코드를 알면 매핑을 읽을 수 있다", async () => {
    await assertSucceeds(getDoc(doc(asUser(OUTSIDER), "joinCodes", "MATH302")));
  });

  it("코드 목록을 훑을 수는 없다", async () => {
    await assertFails(getDocs(collection(asUser(OUTSIDER), "joinCodes")));
  });

  it("남이 만든 코드를 자기 학급으로 가로챌 수 없다", async () => {
    await assertFails(
      updateDoc(doc(asUser(OTHER_TEACHER), "joinCodes", "MATH302"), { classId: CLASS_B }),
    );
  });

  it("비로그인 상태에서는 코드를 읽을 수 없다", async () => {
    await assertFails(getDoc(doc(asGuest(), "joinCodes", "MATH302")));
  });
});

describe("단체 채팅방", () => {
  it("학급 구성원은 메시지를 읽을 수 있다", async () => {
    await assertSucceeds(
      getDocs(query(collection(asUser(STUDENT_1), "messages"), where("classId", "==", CLASS_A))),
    );
  });

  it("다른 학급 사람은 메시지를 읽을 수 없다", async () => {
    await assertFails(
      getDocs(query(collection(asUser(OTHER_TEACHER), "messages"), where("classId", "==", CLASS_A))),
    );
  });

  it("자기 이름으로 보내는 메시지는 허용된다", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(STUDENT_1), "messages", "msg-new"), {
        id: "msg-new",
        classId: CLASS_A,
        senderId: STUDENT_1,
        senderName: "이지훈",
        senderRole: "student",
        content: "안녕하세요",
        createdAt: 2,
      }),
    );
  });

  it("남을 사칭한 메시지는 거부된다", async () => {
    await assertFails(
      setDoc(doc(asUser(STUDENT_1), "messages", "msg-spoof"), {
        id: "msg-spoof",
        classId: CLASS_A,
        senderId: TEACHER,
        senderName: "김선생",
        senderRole: "teacher",
        content: "가짜 공지",
        createdAt: 2,
      }),
    );
  });

  it("자기 uid를 쓰더라도 교사 역할을 사칭할 수 없다", async () => {
    await assertFails(
      setDoc(doc(asUser(STUDENT_1), "messages", "msg-role-spoof"), {
        id: "msg-role-spoof",
        classId: CLASS_A,
        senderId: STUDENT_1,
        senderName: "이지훈",
        senderRole: "teacher",
        content: "가짜 공지",
        createdAt: 2,
      }),
    );
  });

  it("보낸 메시지는 수정·삭제할 수 없다", async () => {
    const db = asUser(TEACHER);
    await assertFails(updateDoc(doc(db, "messages", "msg-1"), { content: "고침" }));
    await assertFails(deleteDoc(doc(db, "messages", "msg-1")));
  });
});

describe("비로그인 차단", () => {
  it("비로그인 상태에서는 아무것도 읽을 수 없다", async () => {
    const db = asGuest();
    await assertFails(getDoc(doc(db, "cards", "card-ann-public")));
    await assertFails(getDoc(doc(db, "profiles", STUDENT_1)));
    await assertFails(getDocs(query(collection(db, "messages"), where("classId", "==", CLASS_A))));
  });
});
