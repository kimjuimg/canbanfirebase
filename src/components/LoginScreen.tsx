import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";

type Mode = "signin" | "signup";

/** Firebase가 돌려주는 오류 코드를 사용자가 읽을 수 있는 문장으로 바꾼다. */
function messageFor(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
  switch (error.code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않습니다.";
    case "auth/missing-password":
    case "auth/weak-password":
      return "비밀번호는 6자 이상이어야 합니다.";
    case "auth/email-already-in-use":
      return "이미 가입된 이메일입니다. 로그인해 주세요.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/too-many-requests":
      return "시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/operation-not-allowed":
      return "이메일/비밀번호 로그인이 꺼져 있습니다. Firebase 콘솔에서 사용 설정해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해 주세요.";
    default:
      return `로그인에 실패했습니다. (${error.code})`;
  }
}

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const created = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const name = displayName.trim();
        if (name) {
          // 프로필 문서는 onAuthStateChanged 쪽에서 만들어지므로, 그전에 이름을 채워 둔다.
          await updateProfile(created.user, { displayName: name });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // 성공하면 onAuthStateChanged가 화면을 바꾼다. 여기서 할 일은 없다.
    } catch (err) {
      console.error("[auth] 인증 실패", err);
      setError(messageFor(err));
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <h2>{mode === "signin" ? "로그인" : "회원가입"}</h2>
        <p>
          {mode === "signin"
            ? "학급 칸반보드를 사용하려면 로그인하세요."
            : "가입하면 학생으로 시작합니다. 교사 권한은 관리자가 따로 부여합니다."}
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="이름 (예: 이지훈)"
              autoComplete="name"
            />
          )}
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "처리 중…" : mode === "signin" ? "로그인" : "가입하기"}
          </button>
        </form>
        {error && <p className="onboarding__error">{error}</p>}
        <p className="onboarding__switch">
          {mode === "signin" ? (
            <>
              계정이 없나요?{" "}
              <button type="button" className="btn btn--link" onClick={() => switchMode("signup")}>
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있나요?{" "}
              <button type="button" className="btn btn--link" onClick={() => switchMode("signin")}>
                로그인
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
