import { useSyncExternalStore } from "react";
import { store } from "../mock/store";

/**
 * mock 스토어를 구독한다. store.subscribe/getSnapshot는 실제 Firestore
 * onSnapshot 리스너로 교체될 자리이며, 이 훅의 시그니처는 그대로 유지된다.
 */
export function useStoreState() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
