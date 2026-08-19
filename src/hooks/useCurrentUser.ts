import type { Profile } from "../types";
import { useCurrentUserContext } from "../context/CurrentUserContext";
import { useStoreState } from "./useStoreState";

/**
 * 현재 로그인한 사용자의 프로필을 반환하는 훅.
 *
 * 시그니처(Profile | null)는 mock 시절과 동일하다. 내부만 Firebase Auth의 uid로
 * Firestore 프로필 문서를 찾는 방식으로 바뀌었고, 호출부 코드는 손대지 않았다.
 * 로그인 직후 프로필 문서가 아직 만들어지지 않은 짧은 구간에도 null이 나온다.
 */
export function useCurrentUser(): Profile | null {
  const { authUser } = useCurrentUserContext();
  const { profiles } = useStoreState();
  if (!authUser) return null;
  return profiles.find((p) => p.id === authUser.uid) ?? null;
}
