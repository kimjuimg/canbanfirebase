import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CardRecord, ListColumn } from "../types";
import { CardItem } from "./CardItem";
import { NewCardForm } from "./NewCardForm";

interface BoardColumnProps {
  list: ListColumn;
  cards: CardRecord[];
  editable: boolean;
  showPublicToggle: boolean;
  onAddCard: (listId: string, title: string, content: string) => void;
  onUpdateCard: (cardId: string, patch: Partial<Pick<CardRecord, "title" | "content" | "isPublic">>) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteList?: (listId: string) => void;
}

export function BoardColumn({
  list,
  cards,
  editable,
  showPublicToggle,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onDeleteList,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: list.id });
  const [addingCard, setAddingCard] = useState(false);
  const sorted = [...cards].sort((a, b) => a.order - b.order);

  return (
    <div className="board-column">
      <div className="board-column__header">
        <h3>{list.title}</h3>
        <span className="board-column__count">{sorted.length}</span>
        {editable && onDeleteList && (
          <button
            className="icon-btn"
            onClick={() => onDeleteList(list.id)}
            aria-label="리스트 삭제"
            title="리스트 삭제"
          >
            ×
          </button>
        )}
      </div>
      <div ref={setNodeRef} className="board-column__body">
        <SortableContext items={sorted.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              editable={editable}
              showPublicToggle={showPublicToggle}
              onUpdate={(patch) => onUpdateCard(card.id, patch)}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </SortableContext>
        {sorted.length === 0 && <p className="board-column__empty">카드 없음</p>}
      </div>
      {editable &&
        (addingCard ? (
          <NewCardForm
            submitLabel="추가"
            onSubmit={(title, content) => {
              onAddCard(list.id, title, content);
              setAddingCard(false);
            }}
            onCancel={() => setAddingCard(false)}
          />
        ) : (
          <button className="add-card-btn" onClick={() => setAddingCard(true)}>
            + 카드 추가
          </button>
        ))}
    </div>
  );
}
