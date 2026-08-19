import { useCurrentUserContext } from "./context/CurrentUserContext";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { useStoreState } from "./hooks/useStoreState";
import { Header } from "./components/Header";
import { LoginScreen } from "./components/LoginScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { TeacherWorkspace } from "./components/TeacherWorkspace";
import { StudentWorkspace } from "./components/StudentWorkspace";
import "./App.css";

/**
 * 인증 게이트. Firestore를 구독하는 컴포넌트는 로그인한 뒤에만 마운트한다 —
 * 보안 규칙이 붙으면 비로그인 상태의 읽기는 거부될 것이므로, 애초에 요청을
 * 보내지 않는 편이 맞다.
 */
function App() {
  const { authUser, authReady } = useCurrentUserContext();

  if (!authReady) {
    return <div className="app-shell app-shell--loading">불러오는 중…</div>;
  }

  if (!authUser) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <LoginScreen />
        </main>
      </div>
    );
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const profile = useCurrentUser();
  const { classes, loaded } = useStoreState();

  // 첫 스냅샷이 도착하기 전에는 모든 컬렉션이 빈 배열이다. 이때 화면을 그리면
  // 학급에 이미 속한 사용자에게도 온보딩 화면이 잠깐 스쳐 지나가므로 막아 둔다.
  // 갓 가입한 사용자는 프로필 문서가 만들어져 스냅샷에 실릴 때까지도 기다린다.
  if (!loaded || !profile) {
    return <div className="app-shell app-shell--loading">불러오는 중…</div>;
  }

  const classRoom = profile.classId ? classes.find((c) => c.id === profile.classId) ?? null : null;

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        {classRoom ? (
          profile.role === "teacher" ? (
            <TeacherWorkspace classRoom={classRoom} profile={profile} />
          ) : (
            <StudentWorkspace classRoom={classRoom} profile={profile} />
          )
        ) : (
          <OnboardingScreen profile={profile} />
        )}
      </main>
    </div>
  );
}

export default App;
