import type { Profile } from "../types";
import { useCurrentUserContext } from "../context/CurrentUserContext";
import { useStoreState } from "./useStoreState";

/**
 * 현재 로그인한 사용자의 프로필을 반환하는 훅.
 *
 * PRD 지침: 지금은 고정된 mock 프로필을 반환하지만, 이후 실제 Firebase
 * Authentication 연동으로 교체할 때도 이 훅의 시그니처(Profile | null)는
 * 그대로 유지한 채 내부 구현만 바꾸면 호출부 코드는 수정할 필요가 없다.
 */
export function useCurrentUser(): Profile | null {
  const { currentProfileId } = useCurrentUserContext();
  const { profiles } = useStoreState();
  return profiles.find((p) => p.id === currentProfileId) ?? null;
}

/**
 * mock 환경 전용 개발 도구: 실습 중 교사/학생 화면을 번갈아 확인할 수 있도록
 * 현재 프로필을 전환한다. 실제 Auth 연동 시 이 훅은 통째로 제거된다.
 */
export function useMockUserSwitcher() {
  const { currentProfileId, setCurrentProfileId } = useCurrentUserContext();
  const { profiles } = useStoreState();
  return { profiles, currentProfileId, setCurrentProfileId };
}
