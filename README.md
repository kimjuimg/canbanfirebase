# 칸반보드 (Firebase 버전)

`prd.md` 기획서를 바탕으로 만든 학습용 칸반보드입니다. React + Vite + TypeScript로 구성했고,
이번 단계에서는 로그인 화면과 실제 Firebase Auth/Firestore 연동 대신 **인메모리 mock 데이터 계층**을
사용합니다. 데이터 모델(`profiles`/`classes`/`lists`/`cards`)은 Firestore 컬렉션 구조를 그대로
따르도록 설계해, 나중에 실제 Firebase로 교체할 때 화면 쪽 코드는 거의 건드리지 않아도 됩니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`(포트는 콘솔에 표시된 값을 따르세요)을 열면 바로 교사 화면으로
진입합니다. 헤더 오른쪽의 **체험 계정 전환 (mock)** 드롭다운으로 교사(김선생)/학생(이지훈, 박서연)
프로필을 바꿔가며 화면을 확인할 수 있습니다.

## 아키텍처 메모

- `src/types.ts` — Firestore 문서 스키마를 전제로 한 정규화된 타입 (`Profile`, `ClassRoom`, `ListColumn`, `CardRecord`).
- `src/mock/store.ts` — Firestore를 흉내 낸 인메모리 클라이언트. `subscribe`/`getSnapshot` 인터페이스는
  `useSyncExternalStore`와 맞물리도록 설계했고, 나중에 실제 `onSnapshot` 리스너로 교체하기 쉽습니다.
- `src/hooks/useCurrentUser.ts` — 로그인 사용자를 반환하는 안정적인 훅. 지금은 mock 세션을 반환하지만,
  실제 Firebase Auth 연동 시에도 이 훅의 시그니처(`Profile | null`)는 유지한 채 내부만 교체하면 됩니다.
  같은 파일의 `useMockUserSwitcher`는 실습 편의를 위한 개발 전용 도구로, 실제 연동 시 통째로 제거됩니다.
- `src/components/KanbanBoard.tsx` — `@dnd-kit` 기반 다중 컬럼 칸반 보드. 같은 리스트 내 순서 변경과
  리스트 간 카드 이동을 모두 지원합니다.
- `src/components/ChatRoom.tsx` — 학급 전체가 함께 보는 단체 채팅방 하나. 메시지는 `messages` 컬렉션에
  `classId`로 묶여 저장되며, 학생 개인 보드와 달리 이 공간은 참여자 전원에게 공개되는 것이 의도된 동작입니다.

## 알려진 범위 밖

PRD의 범위/리스크 절에 따라 다음은 이번 단계에 포함하지 않았습니다: 로그인 화면, 실제 Firebase 연동,
파일 첨부, 카드 댓글, 1:1 채팅, 학급당 복수 교사, Firestore 보안 규칙(현재는 UI 레벨에서만 학생 간 열람을 차단).
