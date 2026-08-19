import { useSyncExternalStore } from "react";
import { store } from "../data/store";

/**
 * Firestore 스토어를 구독한다. 내부 구현이 mock에서 실제 onSnapshot으로 바뀌었지만
 * 이 훅의 시그니처는 그대로라, 호출하는 화면 코드는 손대지 않아도 된다.
 */
export function useStoreState() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
