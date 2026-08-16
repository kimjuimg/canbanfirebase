import { useState, type FormEvent } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { CardRecord, ListColumn } from "../types";
import { BoardColumn } from "./BoardColumn";

interface KanbanBoardProps {
  lists: ListColumn[];
  cards: CardRecord[];
  editable: boolean;
  showPublicToggle: boolean;
  emptyMessage?: string;
  onAddList?: (title: string) => void;
  onDeleteList?: (listId: string) => void;
  onAddCard: (listId: string, title: string, content: string) => void;
  onUpdateCard: (cardId: string, patch: Partial<Pick<CardRecord, "title" | "content" | "isPublic">>) => void;
  onDeleteCard: (cardId: string) => void;
  onMoveCards: (updates: { cardId: string; listId: string; order: number }[]) => void;
}

export function KanbanBoard({
  lists,
  cards,
  editable,
  showPublicToggle,
  emptyMessage,
  onAddList,
  onDeleteList,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onMoveCards,
}: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const sortedLists = [...lists].sort((a, b) => a.order - b.order);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    const overId = String(over.id);
    const overIsList = lists.some((l) => l.id === overId);
    const overCard = overIsList ? undefined : cards.find((c) => c.id === overId);
    const targetListId = overIsList ? overId : overCard?.listId;
    if (!targetListId) return;

    const targetSiblings = cards
      .filter((c) => c.listId === targetListId && c.id !== activeCard.id)
      .sort((a, b) => a.order - b.order);

    // 같은 리스트 안에서 아래로 옮기는 경우, 대상 카드 "다음"에 꽂아야 실제로 이동한다.
    // (그대로 대상 카드 "앞"에 꽂으면 원래 위치로 되돌아가 버린다.)
    let insertIndex = targetSiblings.length;
    if (overCard) {
      const overIndex = targetSiblings.findIndex((c) => c.id === overCard.id);
      if (overIndex !== -1) {
        const movingDownWithinSameList = targetListId === activeCard.listId && activeCard.order < overCard.order;
        insertIndex = movingDownWithinSameList ? overIndex + 1 : overIndex;
      }
    }

    const orderedIds = targetSiblings.map((c) => c.id);
    orderedIds.splice(insertIndex, 0, activeCard.id);

    onMoveCards(orderedIds.map((id, idx) => ({ cardId: id, listId: targetListId, order: idx })));
  }

  function handleAddListSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newListTitle.trim() || !onAddList) return;
    onAddList(newListTitle.trim());
    setNewListTitle("");
    setAddingList(false);
  }

  return (
    <div className="kanban-board">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="kanban-board__columns">
          {sortedLists.map((list) => (
            <BoardColumn
              key={list.id}
              list={list}
              cards={cards.filter((c) => c.listId === list.id)}
              editable={editable}
              showPublicToggle={showPublicToggle}
              onAddCard={onAddCard}
              onUpdateCard={onUpdateCard}
              onDeleteCard={onDeleteCard}
              onDeleteList={editable ? onDeleteList : undefined}
            />
          ))}
          {sortedLists.length === 0 && emptyMessage && <p className="kanban-board__empty">{emptyMessage}</p>}
          {editable && onAddList && (
            <div className="board-column board-column--add">
              {addingList ? (
                <form className="add-list-form" onSubmit={handleAddListSubmit}>
                  <input
                    autoFocus
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="리스트 이름"
                  />
                  <div className="card-form__actions">
                    <button type="submit" className="btn btn--primary btn--sm">
                      추가
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddingList(false)}>
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                <button className="add-list-btn" onClick={() => setAddingList(true)}>
                  + 리스트 추가
                </button>
              )}
            </div>
          )}
        </div>
      </DndContext>
    </div>
  );
}
