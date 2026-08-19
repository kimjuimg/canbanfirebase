import { useState, type FormEvent } from "react";
import type { Profile } from "../types";
import { store } from "../data/store";

interface OnboardingScreenProps {
  profile: Profile;
}

export function OnboardingScreen({ profile }: OnboardingScreenProps) {
  if (profile.role === "teacher") {
    return <CreateClassForm teacherId={profile.id} />;
  }
  return <JoinClassForm studentId={profile.id} />;
}

function CreateClassForm({ teacherId }: { teacherId: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await store.createClass(name.trim(), teacherId);
    } catch (err) {
      console.error("[onboarding] 학급 생성 실패", err);
      setError("학급을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <h2>학급 만들기</h2>
        <p>학급 이름을 입력하면 가입 코드가 자동으로 발급됩니다.</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 3학년 2반"
          />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "만드는 중…" : "학급 만들기"}
          </button>
        </form>
        {error && <p className="onboarding__error">{error}</p>}
      </div>
    </div>
  );
}

function JoinClassForm({ studentId }: { studentId: string }) {
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!joinCode.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await store.joinClassWithCode(studentId, joinCode);
      if (!result.ok) {
        setError(result.error);
      }
    } catch (err) {
      console.error("[onboarding] 학급 참여 실패", err);
      setError("학급에 참여하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <h2>학급 참여하기</h2>
        <p>선생님께 받은 가입 코드를 입력하세요.</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value);
              setError(null);
            }}
            placeholder="가입 코드"
          />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "참여하는 중…" : "참여하기"}
          </button>
        </form>
        {error && <p className="onboarding__error">{error}</p>}
      </div>
    </div>
  );
}
