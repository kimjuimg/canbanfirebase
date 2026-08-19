import { useState } from "react";
import { store } from "../mock/store";
import { useStoreState } from "../hooks/useStoreState";
import type { ClassRoom, Profile } from "../types";
import { ChatRoom } from "./ChatRoom";
import { KanbanBoard } from "./KanbanBoard";
import { ScheduleEditor } from "./ScheduleEditor";

type Tab = "announcement" | "mine" | "schedule" | "chat";

interface StudentWorkspaceProps {
  classRoom: ClassRoom;
  profile: Profile;
}

export function StudentWorkspace({ classRoom, profile }: StudentWorkspaceProps) {
  const { lists, cards } = useStoreState();
  const [tab, setTab] = useState<Tab>("announcement");

  const announcementLists = lists.filter((l) => l.classId === classRoom.id && l.ownerId === "announcement");
  const publicAnnouncementCards = cards.filter(
    (c) => announcementLists.some((l) => l.id === c.listId) && c.isPublic,
  );

  const myLists = lists.filter((l) => l.classId === classRoom.id && l.ownerId === profile.id);
  const myCards = cards.filter((c) => myLists.some((l) => l.id === c.listId));

  return (
    <div className="workspace">
      <div className="workspace__meta">
        <h2>{classRoom.name}</h2>
      </div>

      <nav className="tabs">
        <button className={tab === "announcement" ? "tab tab--active" : "tab"} onClick={() => setTab("announcement")}>
          공지 보드
        </button>
        <button className={tab === "mine" ? "tab tab--active" : "tab"} onClick={() => setTab("mine")}>
          내 기록 보드
        </button>
        <button className={tab === "schedule" ? "tab tab--active" : "tab"} onClick={() => setTab("schedule")}>
          학급 일정
        </button>
        <button className={tab === "chat" ? "tab tab--active" : "tab"} onClick={() => setTab("chat")}>
          학급 채팅
        </button>
      </nav>

      {tab === "announcement" && (
        <>
          <p className="workspace__hint">선생님이 공개한 공지만 표시됩니다.</p>
          <KanbanBoard
            lists={announcementLists}
            cards={publicAnnouncementCards}
            editable={false}
            showPublicToggle={false}
            emptyMessage="아직 공개된 공지가 없습니다."
            onAddCard={() => {}}
            onUpdateCard={() => {}}
            onDeleteCard={() => {}}
            onMoveCards={() => {}}
          />
        </>
      )}

      {tab === "mine" && (
        <>
          <p className="workspace__hint">내 기록은 나와 선생님만 볼 수 있습니다.</p>
          <KanbanBoard
            lists={myLists}
            cards={myCards}
            editable
            showPublicToggle={false}
            onAddList={(title) => store.createList(classRoom.id, profile.id, title)}
            onDeleteList={(listId) => store.deleteList(listId)}
            onAddCard={(listId, title, content) => store.createCard(listId, title, content, profile.id, true)}
            onUpdateCard={(cardId, patch) => store.updateCard(cardId, patch)}
            onDeleteCard={(cardId) => store.deleteCard(cardId)}
            onMoveCards={(updates) => store.moveCards(updates)}
          />
        </>
      )}

      {tab === "schedule" && (
        <ScheduleEditor schedule={classRoom.schedule} editable={false} onAdd={() => {}} onRemove={() => {}} />
      )}

      {tab === "chat" && <ChatRoom classId={classRoom.id} profile={profile} />}
    </div>
  );
}
