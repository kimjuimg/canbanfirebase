import { useState } from "react";
import { store } from "../data/store";
import { useStoreState } from "../hooks/useStoreState";
import type { ClassRoom, Profile } from "../types";
import { ChatRoom } from "./ChatRoom";
import { KanbanBoard } from "./KanbanBoard";
import { ScheduleEditor } from "./ScheduleEditor";

type Tab = "announcement" | "students" | "schedule" | "chat";

interface TeacherWorkspaceProps {
  classRoom: ClassRoom;
  profile: Profile;
}

export function TeacherWorkspace({ classRoom, profile }: TeacherWorkspaceProps) {
  const { lists, cards, profiles } = useStoreState();
  const [tab, setTab] = useState<Tab>("announcement");

  const students = profiles.filter((p) => p.classId === classRoom.id && p.role === "student");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id ?? null);
  const activeStudentId = selectedStudentId && students.some((s) => s.id === selectedStudentId)
    ? selectedStudentId
    : students[0]?.id ?? null;

  const announcementLists = lists.filter((l) => l.classId === classRoom.id && l.ownerId === "announcement");
  const announcementCards = cards.filter((c) => announcementLists.some((l) => l.id === c.listId));

  const studentLists = lists.filter((l) => l.classId === classRoom.id && l.ownerId === activeStudentId);
  const studentCards = cards.filter((c) => studentLists.some((l) => l.id === c.listId));

  return (
    <div className="workspace">
      <div className="workspace__meta">
        <h2>{classRoom.name}</h2>
        <span className="join-code">
          가입 코드 <strong>{classRoom.joinCode}</strong>
        </span>
      </div>

      <nav className="tabs">
        <button className={tab === "announcement" ? "tab tab--active" : "tab"} onClick={() => setTab("announcement")}>
          공지 보드
        </button>
        <button className={tab === "students" ? "tab tab--active" : "tab"} onClick={() => setTab("students")}>
          학생 보드 열람
        </button>
        <button className={tab === "schedule" ? "tab tab--active" : "tab"} onClick={() => setTab("schedule")}>
          학급 일정
        </button>
        <button className={tab === "chat" ? "tab tab--active" : "tab"} onClick={() => setTab("chat")}>
          학급 채팅
        </button>
      </nav>

      {tab === "announcement" && (
        <KanbanBoard
          lists={announcementLists}
          cards={announcementCards}
          editable
          showPublicToggle
          onAddList={(title) => store.createList(classRoom.id, "announcement", title)}
          onDeleteList={(listId) => store.deleteList(listId)}
          onAddCard={(listId, title, content) => store.createCard(listId, title, content, profile.id, false)}
          onUpdateCard={(cardId, patch) => store.updateCard(cardId, patch)}
          onDeleteCard={(cardId) => store.deleteCard(cardId)}
          onMoveCards={(updates) => store.moveCards(updates)}
        />
      )}

      {tab === "students" && (
        <div className="student-viewer">
          {students.length === 0 ? (
            <p className="workspace__hint">아직 참여한 학생이 없습니다. 가입 코드를 공유해 보세요.</p>
          ) : (
            <>
              <div className="student-viewer__picker">
                {students.map((s) => (
                  <button
                    key={s.id}
                    className={activeStudentId === s.id ? "chip chip--active" : "chip"}
                    onClick={() => setSelectedStudentId(s.id)}
                  >
                    {s.displayName}
                  </button>
                ))}
              </div>
              <p className="workspace__hint">교사는 학생 보드를 열람만 할 수 있습니다 (읽기 전용, 다른 학생에게는 노출되지 않습니다).</p>
              <KanbanBoard
                lists={studentLists}
                cards={studentCards}
                editable={false}
                showPublicToggle={false}
                onAddCard={() => {}}
                onUpdateCard={() => {}}
                onDeleteCard={() => {}}
                onMoveCards={() => {}}
              />
            </>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <ScheduleEditor
          schedule={classRoom.schedule}
          editable
          onAdd={(day, period, subject) => store.addScheduleSlot(classRoom.id, day, period, subject)}
          onRemove={(slotId) => store.removeScheduleSlot(classRoom.id, slotId)}
        />
      )}

      {tab === "chat" && <ChatRoom classId={classRoom.id} profile={profile} />}
    </div>
  );
}
