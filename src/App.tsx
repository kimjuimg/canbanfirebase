import { useCurrentUser } from "./hooks/useCurrentUser";
import { useStoreState } from "./hooks/useStoreState";
import { Header } from "./components/Header";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { TeacherWorkspace } from "./components/TeacherWorkspace";
import { StudentWorkspace } from "./components/StudentWorkspace";
import "./App.css";

function App() {
  const profile = useCurrentUser();
  const { classes } = useStoreState();

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
