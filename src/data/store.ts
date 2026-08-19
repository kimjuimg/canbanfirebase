import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  CardRecord,
  ChatMessage,
  ClassRoom,
  ListColumn,
  Profile,
  Role,
  ScheduleSlot,
  Weekday,
} from "../types";
interface StoreState {
  profiles: Profile[];
  classes: ClassRoom[];
  lists: ListColumn[];
  cards: CardRecord[];
  messages: ChatMessage[];
  /** 다섯 컬렉션의 첫 스냅샷이 모두 도착했는지. 그전까지는 빈 배열이라 화면을 막아야 한다. */
  loaded: boolean;
}

type Listener = () => void;

/** Firestore 컬렉션 이름과 StoreState 필드명을 1:1로 맞춰 둔다. */
const COLLECTIONS = ["profiles", "classes", "lists", "cards", "messages"] as const;
type CollectionName = (typeof COLLECTIONS)[number];

function newId(name: CollectionName) {
  return doc(collection(db, name)).id;
}

function makeJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Firestore를 구독하는 데이터 스토어.
 *
 * subscribe/getSnapshot 인터페이스는 useSyncExternalStore와 맞물리도록 mock 시절과
 * 동일하게 유지했다. 달라진 점은 변경 메서드가 모두 비동기라는 것이다 — 쓰기는
 * Firestore로 나가고, 화면 갱신은 그 결과로 되돌아오는 onSnapshot이 담당한다.
 * (Firestore SDK가 로컬 반영을 먼저 해 주므로 체감상 즉시 반영된다.)
 */
class FirestoreStore {
  private state: StoreState = {
    profiles: [],
    classes: [],
    lists: [],
    cards: [],
    messages: [],
    loaded: false,
  };

  private listeners = new Set<Listener>();
  private pending = new Set<CollectionName>(COLLECTIONS);
  private started = false;

  subscribe = (listener: Listener) => {
    this.start();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): StoreState => this.state;

  /**
   * 리스너는 앱 수명 동안 한 번만 붙인다. useSyncExternalStore는 StrictMode에서
   * subscribe/unsubscribe를 반복하는데, 그때마다 onSnapshot을 떼었다 붙이면
   * 불필요한 재요청이 발생하기 때문이다.
   */
  private start() {
    if (this.started) return;
    this.started = true;

    for (const name of COLLECTIONS) {
      onSnapshot(
        collection(db, name),
        (snap) => {
          const rows = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          this.pending.delete(name);
          this.commit({ [name]: rows, loaded: this.pending.size === 0 } as Partial<StoreState>);
        },
        (error) => {
          console.error(`[store] ${name} 구독 실패`, error);
        },
      );
    }
  }

  private commit(patch: Partial<StoreState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  // ---- profiles ----

  getProfile(profileId: string): Profile | undefined {
    return this.state.profiles.find((p) => p.id === profileId);
  }

  /**
   * 로그인한 사용자의 프로필 문서를 보장한다. 문서 ID는 Firebase Auth의 uid다.
   *
   * PRD 03절: 가입한 사용자는 예외 없이 student로 시작하고, teacher 권한은
   * Firebase 콘솔에서 관리자가 role 필드를 직접 바꿔야만 부여된다. 그래서 여기서는
   * 절대 role을 받지 않으며, 이미 문서가 있으면 손대지 않는다 — 재로그인 때
   * 관리자가 올려 둔 teacher 권한을 student로 되돌려 버리면 안 되기 때문이다.
   */
  async ensureProfile(uid: string, displayName: string): Promise<void> {
    const ref = doc(db, "profiles", uid);
    const existing = await getDoc(ref);
    if (existing.exists()) return;
    const profile: Profile = { id: uid, displayName, role: "student", classId: null };
    await setDoc(ref, profile);
  }

  // ---- classes ----

  async createClass(name: string, teacherId: string): Promise<ClassRoom> {
    const newClass: ClassRoom = {
      id: newId("classes"),
      name,
      joinCode: makeJoinCode(),
      teacherId,
      schedule: [],
    };
    const batch = writeBatch(db);
    batch.set(doc(db, "classes", newClass.id), newClass);
    batch.update(doc(db, "profiles", teacherId), { classId: newClass.id });
    const listId = newId("lists");
    batch.set(doc(db, "lists", listId), {
      id: listId,
      classId: newClass.id,
      ownerId: "announcement",
      title: "공지",
      order: 0,
    });
    await batch.commit();
    return newClass;
  }

  async joinClassWithCode(
    profileId: string,
    joinCode: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    // 가입 코드는 항상 대문자로 발급하므로, 입력값도 대문자로 맞춰 조회한다.
    const code = joinCode.trim().toUpperCase();
    const found = await getDocs(query(collection(db, "classes"), where("joinCode", "==", code)));
    if (found.empty) {
      return { ok: false, error: "가입 코드를 찾을 수 없습니다." };
    }
    const classId = found.docs[0].id;

    const batch = writeBatch(db);
    batch.update(doc(db, "profiles", profileId), { classId });
    ["할 일", "완료"].forEach((title, order) => {
      const listId = newId("lists");
      batch.set(doc(db, "lists", listId), { id: listId, classId, ownerId: profileId, title, order });
    });
    await batch.commit();
    return { ok: true };
  }

  async addScheduleSlot(classId: string, day: Weekday, period: number, subject: string) {
    const current = this.state.classes.find((c) => c.id === classId);
    if (!current) return;
    const slot: ScheduleSlot = { id: newId("classes"), day, period, subject };
    await updateDoc(doc(db, "classes", classId), { schedule: [...current.schedule, slot] });
  }

  async removeScheduleSlot(classId: string, slotId: string) {
    const current = this.state.classes.find((c) => c.id === classId);
    if (!current) return;
    await updateDoc(doc(db, "classes", classId), {
      schedule: current.schedule.filter((s) => s.id !== slotId),
    });
  }

  // ---- lists ----

  async createList(classId: string, ownerId: string, title: string) {
    const siblingCount = this.state.lists.filter(
      (l) => l.classId === classId && l.ownerId === ownerId,
    ).length;
    const id = newId("lists");
    await setDoc(doc(db, "lists", id), { id, classId, ownerId, title, order: siblingCount });
  }

  async deleteList(listId: string) {
    const batch = writeBatch(db);
    batch.delete(doc(db, "lists", listId));
    // 리스트가 사라지면 그 안의 카드는 어느 화면에도 못 나오므로 함께 지운다.
    this.state.cards
      .filter((c) => c.listId === listId)
      .forEach((c) => batch.delete(doc(db, "cards", c.id)));
    await batch.commit();
  }

  // ---- cards ----

  async createCard(listId: string, title: string, content: string, createdBy: string, isPublic: boolean) {
    const siblingCount = this.state.cards.filter((c) => c.listId === listId).length;
    const card: CardRecord = {
      id: newId("cards"),
      listId,
      title,
      content,
      order: siblingCount,
      isPublic,
      createdBy,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, "cards", card.id), card);
  }

  async updateCard(cardId: string, patch: Partial<Pick<CardRecord, "title" | "content" | "isPublic">>) {
    await updateDoc(doc(db, "cards", cardId), patch);
  }

  async deleteCard(cardId: string) {
    await deleteDoc(doc(db, "cards", cardId));
  }

  /** 드래그 앤 드롭 후 카드들의 listId/order를 한 번의 배치로 반영한다. */
  async moveCards(updates: { cardId: string; listId: string; order: number }[]) {
    if (updates.length === 0) return;
    const batch = writeBatch(db);
    updates.forEach(({ cardId, listId, order }) => {
      batch.update(doc(db, "cards", cardId), { listId, order });
    });
    await batch.commit();
  }

  // ---- chat ----

  async sendMessage(classId: string, senderId: string, senderName: string, senderRole: Role, content: string) {
    const message: ChatMessage = {
      id: newId("messages"),
      classId,
      senderId,
      senderName,
      senderRole,
      content,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, "messages", message.id), message);
  }
}

export const store = new FirestoreStore();
export type { StoreState };
