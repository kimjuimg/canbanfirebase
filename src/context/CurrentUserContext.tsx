import { createContext, useContext, useState, type ReactNode } from "react";
import { SEED_PROFILES } from "../mock/seedData";

interface CurrentUserContextValue {
  currentProfileId: string;
  setCurrentProfileId: (id: string) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

/**
 * 로그인 화면 없이 즉시 진입하기 위한 mock 세션 컨테이너.
 * 실제 Firebase Auth 연동 시 이 Provider를 onAuthStateChanged 기반 구현으로
 * 교체하되, 하위 컴포넌트가 사용하는 useCurrentUser() 훅의 반환 형태는 유지한다.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentProfileId, setCurrentProfileId] = useState<string>(SEED_PROFILES[0].id);
  return (
    <CurrentUserContext.Provider value={{ currentProfileId, setCurrentProfileId }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUserContext(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUserContext는 CurrentUserProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
