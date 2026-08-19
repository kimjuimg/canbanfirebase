import { useCurrentUser } from "./hooks/useCurrentUser";
import { useStoreState } from "./hooks/useStoreState";
import { Header } from "./components/Header";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { TeacherWorkspace } from "./components/TeacherWorkspace";
import { StudentWorkspace } from "./components/StudentWorkspace";
import "./App.css";

function App() {
  const profile = useCurrentUser();
  const { classes, loaded } = useStoreState();

  // 첫 스냅샷이 도착하기 전에는 모든 컬렉션이 빈 배열이다. 이때 화면을 그리면
  // 학급에 이미 속한 사용자에게도 온보딩 화면이 잠깐 스쳐 지나가므로 막아 둔다.
  if (!loaded) {
    return <div className="app-shell app-shell--loading">불러오는 중…</div>;
  }

  if (!profile) {
    return <div className="app-shell">프로필을 찾을 수 없습니다.</div>;
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
