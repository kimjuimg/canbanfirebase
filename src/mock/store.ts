import type {
  CardRecord,
  ClassRoom,
  ListColumn,
  Profile,
  ScheduleSlot,
  Weekday,
} from "../types";
import { SEED_CARDS, SEED_CLASSES, SEED_LISTS, SEED_PROFILES } from "./seedData";

interface StoreState {
  profiles: Profile[];
  classes: ClassRoom[];
  lists: ListColumn[];
  cards: CardRecord[];
}

type Listener = () => void;

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
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
 * Firestore를 흉내 낸 인메모리 mock 클라이언트.
 * subscribe/getSnapshot 인터페이스는 실제 Firestore onSnapshot 연동으로
 * 교체할 때 동일한 형태(useSyncExternalStore 호환)를 유지하도록 설계했다.
 */
class MockDataStore {
  private state: StoreState = {
    profiles: SEED_PROFILES.map((p) => ({ ...p })),
    classes: SEED_CLASSES.map((c) => ({ ...c, schedule: [...c.schedule] })),
    lists: SEED_LISTS.map((l) => ({ ...l })),
    cards: SEED_CARDS.map((c) => ({ ...c })),
  };

  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): StoreState => this.state;

  private commit(next: StoreState) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  // ---- profiles ----

  getProfile(profileId: string): Profile | undefined {
    return this.state.profiles.find((p) => p.id === profileId);
  }

  // ---- classes ----

  createClass(name: string, teacherId: string): ClassRoom {
    const newClass: ClassRoom = {
      id: nextId("class"),
      name,
      joinCode: makeJoinCode(),
      teacherId,
      schedule: [],
    };
    this.commit({
      ...this.state,
      classes: [...this.state.classes, newClass],
      profiles: this.state.profiles.map((p) =>
        p.id === teacherId ? { ...p, classId: newClass.id } : p,
      ),
      lists: [
        ...this.state.lists,
        { id: nextId("list"), classId: newClass.id, ownerId: "announcement", title: "공지", order: 0 },
      ],
    });
    return newClass;
  }

  joinClassWithCode(profileId: string, joinCode: string): { ok: true } | { ok: false; error: string } {
    const target = this.state.classes.find(
      (c) => c.joinCode.toLowerCase() === joinCode.trim().toLowerCase(),
    );
    if (!target) {
      return { ok: false, error: "가입 코드를 찾을 수 없습니다." };
    }
    this.commit({
      ...this.state,
      profiles: this.state.profiles.map((p) =>
        p.id === profileId ? { ...p, classId: target.id } : p,
      ),
      lists: [
        ...this.state.lists,
        { id: nextId("list"), classId: target.id, ownerId: profileId, title: "할 일", order: 0 },
        { id: nextId("list"), classId: target.id, ownerId: profileId, title: "완료", order: 1 },
      ],
    });
    return { ok: true };
  }

  addScheduleSlot(classId: string, day: Weekday, period: number, subject: string) {
    const slot: ScheduleSlot = { id: nextId("sch"), day, period, subject };
    this.commit({
      ...this.state,
      classes: this.state.classes.map((c) =>
        c.id === classId ? { ...c, schedule: [...c.schedule, slot] } : c,
      ),
    });
  }

  removeScheduleSlot(classId: string, slotId: string) {
    this.commit({
      ...this.state,
      classes: this.state.classes.map((c) =>
        c.id === classId ? { ...c, schedule: c.schedule.filter((s) => s.id !== slotId) } : c,
      ),
    });
  }

  // ---- lists ----

  createList(classId: string, ownerId: string, title: string) {
    const siblingCount = this.state.lists.filter(
      (l) => l.classId === classId && l.ownerId === ownerId,
    ).length;
    const list: ListColumn = { id: nextId("list"), classId, ownerId, title, order: siblingCount };
    this.commit({ ...this.state, lists: [...this.state.lists, list] });
  }

  deleteList(listId: string) {
    this.commit({
      ...this.state,
      lists: this.state.lists.filter((l) => l.id !== listId),
      cards: this.state.cards.filter((c) => c.listId !== listId),
    });
  }

  // ---- cards ----

  createCard(listId: string, title: string, content: string, createdBy: string, isPublic: boolean) {
    const siblingCount = this.state.cards.filter((c) => c.listId === listId).length;
    const card: CardRecord = {
      id: nextId("card"),
      listId,
      title,
      content,
      order: siblingCount,
      isPublic,
      createdBy,
      createdAt: Date.now(),
    };
    this.commit({ ...this.state, cards: [...this.state.cards, card] });
  }

  updateCard(cardId: string, patch: Partial<Pick<CardRecord, "title" | "content" | "isPublic">>) {
    this.commit({
      ...this.state,
      cards: this.state.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
    });
  }

  deleteCard(cardId: string) {
    this.commit({ ...this.state, cards: this.state.cards.filter((c) => c.id !== cardId) });
  }

  /** 드래그 앤 드롭 후 카드들의 listId/order를 한 번에 반영한다. */
  moveCards(updates: { cardId: string; listId: string; order: number }[]) {
    const byId = new Map(updates.map((u) => [u.cardId, u]));
    this.commit({
      ...this.state,
      cards: this.state.cards.map((c) => {
        const update = byId.get(c.id);
        return update ? { ...c, listId: update.listId, order: update.order } : c;
      }),
    });
  }
}

export const store = new MockDataStore();
export type { StoreState };
