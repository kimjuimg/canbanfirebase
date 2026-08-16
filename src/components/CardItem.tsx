import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardRecord } from "../types";
import { NewCardForm } from "./NewCardForm";

interface CardItemProps {
  card: CardRecord;
  editable: boolean;
  showPublicToggle: boolean;
  onUpdate: (patch: Partial<Pick<CardRecord, "title" | "content" | "isPublic">>) => void;
  onDelete: () => void;
}

export function CardItem({ card, editable, showPublicToggle, onUpdate, onDelete }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const [editing, setEditing] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (editing) {
    return (
      <div ref={setNodeRef} style={style} className="card">
        <NewCardForm
          initialTitle={card.title}
          initialContent={card.content}
          submitLabel="수정 완료"
          onSubmit={(title, content) => {
            onUpdate({ title, content });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="card">
      <div className="card__header">
        {editable && (
          <span className="card__handle" {...attributes} {...listeners} aria-label="드래그하여 순서 변경">
            ⠿
          </span>
        )}
        <strong className="card__title">{card.title}</strong>
        {showPublicToggle && (
          <span className={`badge ${card.isPublic ? "badge--public" : "badge--draft"}`}>
            {card.isPublic ? "공개" : "비공개"}
          </span>
        )}
      </div>
      {card.content && <p className="card__content">{card.content}</p>}
      {editable && (
        <div className="card__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
            수정
          </button>
          {showPublicToggle && (
            <button className="btn btn--ghost btn--sm" onClick={() => onUpdate({ isPublic: !card.isPublic })}>
              {card.isPublic ? "비공개로 전환" : "공개로 전환"}
            </button>
          )}
          <button className="btn btn--ghost btn--sm btn--danger" onClick={onDelete}>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
