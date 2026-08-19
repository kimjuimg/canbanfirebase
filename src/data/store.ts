import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Query,
  type Unsubscribe,
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
  /** 지금 권한 범위에 필요한 첫 스냅샷이 모두 도착했는지. */
  loaded: boolean;
}

type Listener = () => void;

const EMPTY_STATE: StoreState = {
  profiles: [],
  classes: [],
  lists: [],
  cards: [],
  messages: [],
  loaded: false,
};

function makeJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function newId(name: string) {
  return doc(collection(db, name)).id;
}

/**
 * Firestore를 구독하는 데이터 스토어.
 *
 * 보안 규칙은 필터가 아니다 — 권한 없는 문서가 하나라도 섞일 수 있는 쿼리는 통째로
 * 거부된다. 그래서 컬렉션 전체를 구독하지 않고, 로그인한 사용자의 학급과 역할에 맞춰
 * 쿼리를 좁힌다. 교사는 학급 전체를, 학생은 자기 보드와 공개된 공지만 구독한다.
 *
 * subscribe/getSnapshot 인터페이스는 mock 시절과 같아서 화면 코드는 그대로다.
 */
class FirestoreStore {
  private state: StoreState = EMPTY_STATE;
  private listeners = new Set<Listener>();

  private uid: string | null = null;
  private ownProfileUnsub: Unsubscribe | null = null;
  private ownProfile: Profile | null = null;
  private ownProfileLoaded = false;

  /** 학급 범위 구독은 (학급, 역할)이 바뀔 때마다 통째로 다시 건다. */
  private scopeKey: string | null = null;
  private scopeUnsubs: Unsubscribe[] = [];
  private pendingScope = new Set<string>();

  // 여러 쿼리에서 나눠 들어오는 조각들. 마지막에 id 기준으로 합친다.
  private classRoom: ClassRoom | null = null;
  private classProfiles: Profile[] = [];
  private listParts = new Map<string, ListColumn[]>();
  private cardParts = new Map<string, CardRecord[]>();
  private messages: ChatMessage[] = [];

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): StoreState => this.state;

  /**
   * 로그인 상태가 바뀔 때 호출한다. 로그아웃 시에는 모든 구독을 끊고 상태를 비운다 —
   * 이전 사용자의 데이터가 다음 사용자 화면에 남아 있으면 안 된다.
   */
  setUser(uid: string | null) {
    if (this.uid === uid) return;
    this.uid = uid;

    this.ownProfileUnsub?.();
    this.ownProfileUnsub = null;
    this.ownProfile = null;
    this.ownProfileLoaded = false;
    this.clearScope();

    if (!uid) {
      this.state = EMPTY_STATE;
      this.notify();
      return;
    }

    this.state = EMPTY_STATE;
    this.notify();

    // 자기 프로필 문서는 항상 읽을 수 있다. 여기서 얻은 classId/role이 이후
    // 학급 범위 구독의 근거가 된다.
    this.ownProfileUnsub = onSnapshot(
      doc(db, "profiles", uid),
      (snap) => {
        this.ownProfile = snap.exists() ? ({ ...snap.data(), id: snap.id } as Profile) : null;
        this.ownProfileLoaded = true;
        this.applyScope();
        this.recompute();
      },
      (error) => {
        console.error("[store] 내 프로필 구독 실패", error);
        this.ownProfileLoaded = true;
        this.recompute();
      },
    );
  }

  private clearScope() {
    this.scopeUnsubs.forEach((unsub) => unsub());
    this.scopeUnsubs = [];
    this.scopeKey = null;
    this.pendingScope.clear();
    this.classRoom = null;
    this.classProfiles = [];
    this.listParts.clear();
    this.cardParts.clear();
    this.messages = [];
  }

  private applyScope() {
    const profile = this.ownProfile;
    const key = profile?.classId ? `${profile.classId}|${profile.role}` : null;
    if (key === this.scopeKey) return;

    this.clearScope();
    this.scopeKey = key;
    if (!profile?.classId) return;

    const classId = profile.classId;
    const isTeacher = profile.role === "teacher";

    this.watchDoc("class", doc(db, "classes", classId), (data) => {
      this.classRoom = data as ClassRoom | null;
    });

    this.watchQuery("profiles", query(collection(db, "profiles"), where("classId", "==", classId)), (rows) => {
      this.classProfiles = rows as Profile[];
    });

    if (isTeacher) {
      // 교사는 학급의 모든 보드를 열람한다(PRD P0).
      this.watchQuery("lists", query(collection(db, "lists"), where("classId", "==", classId)), (rows) => {
        this.listParts.set("all", rows as ListColumn[]);
      });
      this.watchQuery("cards", query(collection(db, "cards"), where("classId", "==", classId)), (rows) => {
        this.cardParts.set("all", rows as CardRecord[]);
      });
    } else {
      // 학생은 자기 보드와 공지 보드만. 남의 개인 보드는 쿼리 자체를 만들지 않는다.
      this.watchQuery(
        "lists:mine",
        query(collection(db, "lists"), where("classId", "==", classId), where("ownerId", "==", profile.id)),
        (rows) => this.listParts.set("mine", rows as ListColumn[]),
      );
      this.watchQuery(
        "lists:announcement",
        query(collection(db, "lists"), where("classId", "==", classId), where("ownerId", "==", "announcement")),
        (rows) => this.listParts.set("announcement", rows as ListColumn[]),
      );
      this.watchQuery(
        "cards:mine",
        query(collection(db, "cards"), where("classId", "==", classId), where("ownerId", "==", profile.id)),
        (rows) => this.cardParts.set("mine", rows as CardRecord[]),
      );
      // 교사의 비공개 초안은 규칙상 읽을 수 없으므로 isPublic 조건을 쿼리에 넣는다.
      this.watchQuery(
        "cards:announcement",
        query(
          collection(db, "cards"),
          where("classId", "==", classId),
          where("ownerId", "==", "announcement"),
          where("isPublic", "==", true),
        ),
        (rows) => this.cardParts.set("announcement", rows as CardRecord[]),
      );
    }

    this.watchQuery("messages", query(collection(db, "messages"), where("classId", "==", classId)), (rows) => {
      this.messages = rows as ChatMessage[];
    });
  }

  private watchDoc(key: string, ref: ReturnType<typeof doc>, apply: (data: unknown) => void) {
    this.pendingScope.add(key);
    this.scopeUnsubs.push(
      onSnapshot(
        ref,
        (snap) => {
          apply(snap.exists() ? { ...snap.data(), id: snap.id } : null);
          this.pendingScope.delete(key);
          this.recompute();
        },
        (error) => this.onScopeError(key, error),
      ),
    );
  }

  private watchQuery(key: string, q: Query, apply: (rows: unknown[]) => void) {
    this.pendingScope.add(key);
    this.scopeUnsubs.push(
      onSnapshot(
        q,
        (snap) => {
          apply(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
          this.pendingScope.delete(key);
          this.recompute();
        },
        (error) => this.onScopeError(key, error),
      ),
    );
  }

  /** 구독이 실패해도 화면이 로딩에 갇히지 않도록 해당 조각을 완료로 처리한다. */
  private onScopeError(key: string, error: unknown) {
    console.error(`[store] ${key} 구독 실패`, error);
    this.pendingScope.delete(key);
    this.recompute();
  }

  private recompute() {
    const byId = <T extends { id: string }>(groups: T[][]): T[] => {
      const merged = new Map<string, T>();
      groups.forEach((rows) => rows.forEach((row) => merged.set(row.id, row)));
      return [...merged.values()];
    };

    const profiles = byId<Profile>([this.ownProfile ? [this.ownProfile] : [], this.classProfiles]);

    this.state = {
      profiles,
      classes: this.classRoom ? [this.classRoom] : [],
      lists: byId<ListColumn>([...this.listParts.values()]),
      cards: byId<CardRecord>([...this.cardParts.values()]),
      messages: this.messages,
      loaded: this.ownProfileLoaded && this.pendingScope.size === 0,
    };
    this.notify();
  }

  private notify() {
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

  /**
   * 학급을 만들고 만든 교사를 그 학급에 넣는다.
   *
   * 두 번에 나눠 쓰는 이유: 보안 규칙의 get()은 배치 이전 상태를 본다. 공지 리스트
   * 생성 규칙은 "내 프로필의 classId가 이 학급인가"를 보므로, 프로필 갱신과 같은
   * 배치에 넣으면 아직 갱신 전이라 거부된다.
   */
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
    // 가입 코드는 별도 컬렉션에 둔다. 코드를 아는 사람만 문서 ID로 집어 읽을 수 있어,
    // 학급 목록을 훑어 코드를 캐내는 경로가 막힌다.
    batch.set(doc(db, "joinCodes", newClass.joinCode), {
      classId: newClass.id,
      teacherId,
    });
    batch.update(doc(db, "profiles", teacherId), { classId: newClass.id });
    await batch.commit();

    const listId = newId("lists");
    await setDoc(doc(db, "lists", listId), {
      id: listId,
      classId: newClass.id,
      ownerId: "announcement",
      title: "공지",
      order: 0,
    });

    return newClass;
  }

  async joinClassWithCode(
    profileId: string,
    joinCode: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    // 가입 코드는 항상 대문자로 발급하므로, 입력값도 대문자로 맞춰 조회한다.
    const code = joinCode.trim().toUpperCase();
    const mapping = await getDoc(doc(db, "joinCodes", code));
    if (!mapping.exists()) {
      return { ok: false, error: "가입 코드를 찾을 수 없습니다." };
    }
    const classId = mapping.data().classId as string;

    // 프로필을 먼저 갱신해야 개인 보드 리스트 생성이 규칙을 통과한다(createClass 주석 참고).
    await updateDoc(doc(db, "profiles", profileId), { classId });

    const batch = writeBatch(db);
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
    const list = this.state.lists.find((l) => l.id === listId);
    if (!list) return;
    const siblingCount = this.state.cards.filter((c) => c.listId === listId).length;
    const card: CardRecord = {
      id: newId("cards"),
      listId,
      classId: list.classId,
      ownerId: list.ownerId,
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
      const list = this.state.lists.find((l) => l.id === listId);
      // 목적지 리스트의 소유자 정보를 함께 옮겨 비정규화된 값이 어긋나지 않게 한다.
      const denormalized = list ? { classId: list.classId, ownerId: list.ownerId } : {};
      batch.update(doc(db, "cards", cardId), { listId, order, ...denormalized });
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
