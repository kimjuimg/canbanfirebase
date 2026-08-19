import { useMockUserSwitcher } from "../hooks/useCurrentUser";

export function Header() {
  const { profiles, currentProfileId, setCurrentProfileId } = useMockUserSwitcher();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo" aria-hidden>
          📋
        </span>
        <span>칸반보드</span>
      </div>
      <div className="app-header__user">
        <label htmlFor="mock-user-select" className="app-header__switch-label">
          체험 계정 전환 (mock)
        </label>
        <select
          id="mock-user-select"
          value={currentProfileId}
          onChange={(e) => setCurrentProfileId(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName} · {p.role === "teacher" ? "교사" : "학생"}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
