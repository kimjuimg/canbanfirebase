import { useState, type FormEvent } from "react";

interface NewCardFormProps {
  initialTitle?: string;
  initialContent?: string;
  submitLabel?: string;
  onSubmit: (title: string, content: string) => void;
  onCancel: () => void;
}

export function NewCardForm({
  initialTitle = "",
  initialContent = "",
  submitLabel = "저장",
  onSubmit,
  onCancel,
}: NewCardFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), content.trim());
  }

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <input
        autoFocus
        className="card-form__title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
      />
      <textarea
        className="card-form__content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용 (선택)"
        rows={2}
      />
      <div className="card-form__actions">
        <button type="submit" className="btn btn--primary btn--sm">
          {submitLabel}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          취소
        </button>
      </div>
    </form>
  );
}
