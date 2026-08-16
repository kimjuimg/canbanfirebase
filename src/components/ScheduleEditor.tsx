import { useState, type FormEvent } from "react";
import type { ScheduleSlot, Weekday } from "../types";

const DAYS: Weekday[] = ["월", "화", "수", "목", "금"];
const PERIODS = [1, 2, 3, 4, 5, 6];

interface ScheduleEditorProps {
  schedule: ScheduleSlot[];
  editable: boolean;
  onAdd: (day: Weekday, period: number, subject: string) => void;
  onRemove: (slotId: string) => void;
}

export function ScheduleEditor({ schedule, editable, onAdd, onRemove }: ScheduleEditorProps) {
  const [day, setDay] = useState<Weekday>("월");
  const [period, setPeriod] = useState(1);
  const [subject, setSubject] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    onAdd(day, period, subject.trim());
    setSubject("");
  }

  const bySlot = new Map<string, ScheduleSlot>();
  schedule.forEach((s) => bySlot.set(`${s.day}-${s.period}`, s));

  return (
    <div className="schedule-editor">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>교시</th>
            {DAYS.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((p) => (
            <tr key={p}>
              <td className="schedule-table__period">{p}교시</td>
              {DAYS.map((d) => {
                const slot = bySlot.get(`${d}-${p}`);
                return (
                  <td key={d} className="schedule-table__cell">
                    {slot ? (
                      <span className="schedule-slot">
                        {slot.subject}
                        {editable && (
                          <button className="icon-btn" onClick={() => onRemove(slot.id)} aria-label="일정 삭제">
                            ×
                          </button>
                        )}
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <form className="schedule-form" onSubmit={handleSubmit}>
          <select value={day} onChange={(e) => setDay(e.target.value as Weekday)}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}요일
              </option>
            ))}
          </select>
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}교시
              </option>
            ))}
          </select>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="과목명" />
          <button type="submit" className="btn btn--primary btn--sm">
            추가
          </button>
        </form>
      )}
    </div>
  );
}
