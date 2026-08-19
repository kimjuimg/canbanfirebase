import { useEffect, useRef, useState, type FormEvent } from "react";
import { store } from "../mock/store";
import { useStoreState } from "../hooks/useStoreState";
import type { Profile } from "../types";

interface ChatRoomProps {
  classId: string;
  profile: Profile;
}

export function ChatRoom({ classId, profile }: ChatRoomProps) {
  const { messages } = useStoreState();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const roomMessages = messages.filter((m) => m.classId === classId).sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [roomMessages.length]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    store.sendMessage(classId, profile.id, profile.displayName, profile.role, text.trim());
    setText("");
  }

  return (
    <div className="chat-room">
      <p className="workspace__hint">이 채팅방은 이 학급의 교사와 학생 전원에게 공개됩니다.</p>
      <div className="chat-room__messages">
        {roomMessages.length === 0 && <p className="chat-room__empty">아직 대화가 없습니다. 첫 메시지를 남겨보세요.</p>}
        {roomMessages.map((m) => (
          <div key={m.id} className={`chat-message ${m.senderId === profile.id ? "chat-message--mine" : ""}`}>
            <div className="chat-message__meta">
              <span className="chat-message__sender">{m.senderName}</span>
              <span className={`role-badge role-badge--${m.senderRole}`}>
                {m.senderRole === "teacher" ? "교사" : "학생"}
              </span>
              <span className="chat-message__time">
                {new Date(m.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="chat-message__content">{m.content}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-room__form" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
        />
        <button type="submit" className="btn btn--primary btn--sm">
          보내기
        </button>
      </form>
    </div>
  );
}
