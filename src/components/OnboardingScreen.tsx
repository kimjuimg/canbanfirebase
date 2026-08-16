import { useState, type FormEvent } from "react";
import type { Profile } from "../types";
import { store } from "../mock/store";

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    store.createClass(name.trim(), teacherId);
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
          <button type="submit" className="btn btn--primary">
            학급 만들기
          </button>
        </form>
      </div>
    </div>
  );
}

function JoinClassForm({ studentId }: { studentId: string }) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const result = store.joinClassWithCode(studentId, joinCode);
    if (!result.ok) {
      setError(result.error);
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
          <button type="submit" className="btn btn--primary">
            참여하기
          </button>
        </form>
        {error && <p className="onboarding__error">{error}</p>}
      </div>
    </div>
  );
}
