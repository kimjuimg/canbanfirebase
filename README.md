# 칸반보드 (Firebase 버전)

`prd.md` 기획서를 바탕으로 만든 학습용 칸반보드입니다. React + Vite + TypeScript로 구성했고,
백엔드는 Firebase만 씁니다 — 인증은 **Firebase Authentication**(이메일/비밀번호), 데이터는
**Firestore**(`profiles`/`classes`/`lists`/`cards`/`messages`/`joinCodes`)에 저장하며 `onSnapshot`으로
실시간 동기화합니다. 자체 서버 코드는 없고, 접근 제어는 전적으로 `firestore.rules`가 담당합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`(포트는 콘솔에 표시된 값을 따르세요)을 열면 로그인 화면이 뜹니다.

### 처음 한 번만 필요한 설정

1. Firebase 콘솔 → Authentication → Sign-in method에서 **이메일/비밀번호**를 사용 설정합니다.
2. 앱에서 회원가입합니다. **가입한 계정은 예외 없이 학생으로 시작합니다**(PRD 03절).
3. 교사가 필요하면 Firebase 콘솔 → Firestore → `profiles` → 해당 문서의 `role`을 `teacher`로 바꿉니다.
   이것이 교사 권한을 얻는 유일한 경로입니다. 앱 안에는 스스로 승격할 방법이 없습니다.
4. 교사 계정으로 학급을 만들고, 발급된 가입 코드를 학생에게 알려 주면 됩니다.

## 보안 규칙

**규칙을 배포하지 않으면 데이터가 무방비입니다.** 규칙은 이 저장소의 `firestore.rules`에 있고,
배포해야 실제로 적용됩니다.

```bash
npx firebase login          # 최초 1회
npx firebase deploy --only firestore:rules
```

콘솔에서 직접 붙여 넣어도 됩니다: Firestore → 규칙 탭에 `firestore.rules` 내용을 붙이고 게시.

### 규칙이 지키는 불변식

| 불변식 | 근거 |
|---|---|
| 학생의 개인 기록(리스트·카드)은 같은 학급의 다른 학생에게 보이지 않는다 | PRD P0, 성공 지표 "정보 유출 0건" |
| 교사의 비공개 공지 초안은 학생에게 보이지 않는다 | PRD P0 |
| 교사는 자기 학급의 모든 학생 보드를 열람할 수 있다 | PRD 03절 |
| `role`은 사용자가 스스로 바꿀 수 없다 | PRD 03절 |
| 단체 채팅방은 그 학급 구성원 전원에게 공개된다 (의도된 예외) | PRD 02절 |
| 채팅 메시지의 보낸 사람은 사칭할 수 없다 | — |

### 규칙 테스트

규칙을 고치면 반드시 통과시키세요. Firestore 에뮬레이터를 띄워 32개 시나리오를 검증합니다.

```bash
npm run test:rules
```

> Java 21 이상이면 `firebase-tools`를 최신으로 올려도 됩니다. 현재는 Java 17 환경을 지원하는
> `firebase-tools@13`에 고정돼 있습니다.

## 아키텍처 메모

- `src/types.ts` — Firestore 문서 스키마를 전제로 한 정규화된 타입.
- `src/firebase.ts` — Firebase 앱 초기화, Firestore(`db`)와 Auth(`auth`) 인스턴스.
- `src/context/CurrentUserContext.tsx` — `onAuthStateChanged` 기반 세션. 로그인 시 프로필 문서가
  없으면 만들되(항상 `student`), 이미 있으면 손대지 않습니다 — 재로그인 때 관리자가 올려 둔 교사
  권한이 되돌아가면 안 되기 때문입니다.
- `src/hooks/useCurrentUser.ts` — 로그인 사용자의 프로필을 반환합니다. 시그니처(`Profile | null`)는
  mock 시절부터 그대로라, 내부가 두 번 바뀌는 동안에도 화면 코드는 손대지 않았습니다.
- `src/data/store.ts` — Firestore 구독 스토어. **보안 규칙은 필터가 아닙니다** — 권한 없는 문서가
  하나라도 섞일 수 있는 쿼리는 통째로 거부되므로, 로그인 사용자의 학급과 역할에 맞춰 쿼리를 좁혀
  구독합니다. 교사는 학급 전체를, 학생은 자기 보드와 공개된 공지만 봅니다.
- `src/components/KanbanBoard.tsx` — `@dnd-kit` 기반 다중 컬럼 칸반 보드.
- `src/components/ChatRoom.tsx` — 학급 전체가 함께 보는 단체 채팅방 하나.

### 카드의 비정규화 필드

`cards` 문서는 부모 리스트의 `classId`/`ownerId`를 복사해 갖습니다. 규칙이 카드 문서 하나만 보고
권한을 판단할 수 있어야 하고(부모 조회는 읽기 비용이자 규칙 복잡도), 클라이언트도 그 필드로 쿼리를
좁혀야 하기 때문입니다. 카드를 다른 리스트로 옮길 때 이 값도 함께 갱신됩니다.

### 가입 코드

`joinCodes/{코드}` 문서가 코드 → 학급을 매핑합니다. 문서 ID가 곧 코드라 **코드를 아는 사람만**
집어 읽을 수 있고 목록 조회는 막혀 있어, 학급을 훑어 코드를 캐낼 수 없습니다.

## 알려진 범위 밖

PRD의 범위/리스크 절에 따라 다음은 아직 포함하지 않았습니다: 학급 삭제, Google 로그인(P2),
이메일 인증(P2), 파일 첨부, 카드 댓글, 1:1 채팅, 학급당 복수 교사.

알려진 한계:

- **학급 참여는 학급 ID를 알면 코드 없이도 가능합니다.** 규칙은 프로필의 `classId` 변경을 막지
  않습니다(막으면 참여 자체가 불가능해집니다). 학급 ID는 20자 난수라 사실상 가입 코드를 통해서만
  얻을 수 있어 현실적인 위험은 낮지만, 원리상 코드 검증이 서버에 없다는 점은 남아 있습니다.
- 가입 코드가 충돌하면 학급 생성이 실패합니다. 재시도 로직은 없습니다.
- Firestore SDK가 번들에 포함되어 클라이언트 청크가 약 800kB입니다. 코드 분할은 하지 않았습니다.
