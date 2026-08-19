import { useCurrentUserContext } from "../context/CurrentUserContext";
import { useCurrentUser } from "../hooks/useCurrentUser";

export function Header() {
  const { authUser, logout } = useCurrentUserContext();
  const profile = useCurrentUser();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo" aria-hidden>
          📋
        </span>
        <span>칸반보드</span>
      </div>
      {authUser && (
        <div className="app-header__user">
          <span className="app-header__name">{profile?.displayName ?? authUser.email}</span>
          {profile && (
            <span className={`role-badge role-badge--${profile.role}`}>
              {profile.role === "teacher" ? "교사" : "학생"}
            </span>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void logout()}>
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}
