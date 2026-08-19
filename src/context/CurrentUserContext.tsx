import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import { store } from "../data/store";

interface CurrentUserContextValue {
  /** 로그인한 Firebase Auth 사용자. 비로그인 상태면 null. */
  authUser: User | null;
  /** 첫 인증 상태 확인이 끝났는지. 그전에는 로그인 화면과 앱 화면 중 무엇을 그릴지 알 수 없다. */
  authReady: boolean;
  logout: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

/**
 * Firebase Authentication 세션 컨테이너.
 *
 * 로그인 직후에는 Auth 계정만 있고 Firestore의 프로필 문서는 아직 없을 수 있어,
 * 여기서 프로필 문서 존재를 보장한다. 역할은 항상 student로 만들어지며(PRD 03절),
 * teacher 승격은 Firebase 콘솔에서만 이뤄진다.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      // 스토어 구독은 로그인한 사용자의 학급/역할에 맞춰 범위가 정해진다.
      // 로그아웃 시 null을 넘겨 이전 사용자의 데이터를 남기지 않는다.
      store.setUser(user?.uid ?? null);
      if (user) {
        const fallbackName = user.email?.split("@")[0] ?? "이름 없음";
        void store.ensureProfile(user.uid, user.displayName?.trim() || fallbackName);
      }
    });
  }, []);

  const value = useMemo<CurrentUserContextValue>(
    () => ({ authUser, authReady, logout: () => signOut(auth) }),
    [authUser, authReady],
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUserContext(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUserContext는 CurrentUserProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
