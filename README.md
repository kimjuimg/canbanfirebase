# 칸반보드 (Firebase 버전)

`prd.md` 기획서를 바탕으로 만든 학습용 칸반보드입니다. React + Vite + TypeScript로 구성했고,
데이터는 **실제 Firestore**(`profiles`/`classes`/`lists`/`cards`/`messages` 컬렉션)에 저장하며
`onSnapshot`으로 실시간 동기화합니다. 로그인 화면과 Firebase Auth 연동은 PRD 06절 지침에 따라
아직 붙이지 않았고, 사용자 세션은 계속 mock으로 둡니다.

> **경고 — 지금 이 프로젝트의 데이터는 공개 상태입니다.**
> Firestore가 테스트 모드 규칙으로 열려 있어 누구나 읽고 쓸 수 있습니다. Auth 연동과 보안 규칙
> 작성이 끝나기 전까지는 실제 학생 정보를 절대 넣지 마세요. PRD 07절이 지적한 대로, 이 앱의
> 접근 제어는 전적으로 Firestore 보안 규칙에 달려 있습니다.

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
- `src/firebase.ts` — Firebase 앱 초기화와 Firestore 인스턴스(`db`).
- `src/data/store.ts` — 다섯 컬렉션을 `onSnapshot`으로 구독하는 데이터 스토어. `subscribe`/`getSnapshot`
  인터페이스는 mock 시절과 동일해서 화면 코드는 그대로지만, 변경 메서드는 모두 비동기입니다. 쓰기는
  Firestore로 나가고 화면 갱신은 되돌아오는 스냅샷이 담당합니다. 첫 실행 시 `profiles`가 비어 있으면
  `src/mock/seedData.ts`의 실습용 시드를 고정 문서 ID로 한 번만 심습니다.
- `src/hooks/useCurrentUser.ts` — 로그인 사용자를 반환하는 안정적인 훅. 지금은 mock 세션을 반환하지만,
  실제 Firebase Auth 연동 시에도 이 훅의 시그니처(`Profile | null`)는 유지한 채 내부만 교체하면 됩니다.
  같은 파일의 `useMockUserSwitcher`는 실습 편의를 위한 개발 전용 도구로, 실제 연동 시 통째로 제거됩니다.
- `src/components/KanbanBoard.tsx` — `@dnd-kit` 기반 다중 컬럼 칸반 보드. 같은 리스트 내 순서 변경과
  리스트 간 카드 이동을 모두 지원합니다.
- `src/components/ChatRoom.tsx` — 학급 전체가 함께 보는 단체 채팅방 하나. 메시지는 `messages` 컬렉션에
  `classId`로 묶여 저장되며, 학생 개인 보드와 달리 이 공간은 참여자 전원에게 공개되는 것이 의도된 동작입니다.

## 알려진 범위 밖

PRD의 범위/리스크 절에 따라 다음은 아직 포함하지 않았습니다: 로그인 화면과 Firebase Auth 연동,
**Firestore 보안 규칙**(현재는 UI 레벨에서만 학생 간 열람을 차단), 학급 삭제, 파일 첨부, 카드 댓글,
1:1 채팅, 학급당 복수 교사.

다음 단계는 Auth 연동이며, 그다음이 보안 규칙입니다. 규칙은 데이터 구조와 인증 주체가 확정된 뒤에
써야 어긋나지 않습니다.
