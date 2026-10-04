# OFFROU 오프루

> 같은 하루에, 다른 시간을.

OFF + ROUTE. 매일 반복되는 루트에서 잠시 벗어나 평소와 다른 시간을 경험하도록 돕는 B2C 경험·여가 서비스.
모바일 중심 반응형 웹앱 + PWA (React · TypeScript · Vite).

## 실행

```bash
npm install
npm run dev        # 개발 서버 http://localhost:5173 (같은 Wi-Fi의 휴대폰에서도 접속 가능)
npm test           # 테스트
npm run build      # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 확인 http://localhost:4173 (서비스 워커는 여기서만 동작)
```

## 주소 구조 (7단계)

| 주소 | 내용 |
|---|---|
| `/` | OFFROU 공식 홈페이지 (따로 불러오는 chunk) |
| `/app` | 서비스 HOME — 지금 딱 하나 · 나에게 맞춰서 · 작은 OFFROU 코스 · 오늘의 OFFROU (설치한 PWA는 여기서 시작) |
| `/app/now` | 지금 딱 하나 (질문 없이 바로 하나, `?pick=`) |
| `/app/course` · `/app/course/next` · `/app/course/done` | 작은 코스 만들기·중간·마무리 (코스는 `?cmin=&cvibe=&csteps=`에 담긴다) |
| `/app/ready` · `/app/discover/:카테고리` · `/app/experience/:id(/play·/done)` · `/app/my` · `/app/account(/reset)` | 서비스 화면 |
| `/ready`, `/discover/*`, `/experience/*`, `/my`, `/account/*` | 예전 주소 → `/app/...`으로 이동 (쿼리·해시 유지) |

- 홈페이지에 보이는 경험·카테고리·이야기는 실제 콘텐츠 데이터에서 id로 가져온다. 고르는 목록과 회사·문의·약관 정보는 `src/data/site.ts`에 있다 (확정되지 않은 값은 `null` → 화면에 표시하지 않음).
- SEO: 기본 title·description·Open Graph는 `index.html`. 배포 주소·공유 이미지가 정해지면 `VITE_SITE_URL`, `VITE_OG_IMAGE`를 설정하면 빌드 시 canonical·og:url·og:image가 추가된다 (`seo-meta.ts`).

## 구조

```
src/
  app/           라우트(router.tsx), 경로(paths.ts), 하단 내비게이션 항목(navigation.tsx)
  components/    layout(AppShell, BottomNav) / ui(ChoiceCard, Chip, Button, EmptyState, PageHeader)
  data/          moods · durations · categories · places — 선택지/카테고리 데이터 · site(홈페이지 설정)
    experiences/ 경험 메타데이터·추천 정보·태그 (카테고리별 파일, 51개)
    stories/     EXPERIENCE 인터랙티브 장면 데이터 (10편)
  features/      site(공식 홈페이지) · home · ready(추천 결과) · experience(상세·진행·완료) · discover(검색·필터) · my · account
    experience/runners/  실행 방식별 실행기 (guide · rest · prompts · focus · story)
    experience/story/    인터랙티브 이야기 엔진(engine.ts) + 화면(StoryRunner)
  services/      experiences(콘텐츠 조회) · recommendation(추천 엔진, 순수 함수) · personalization(기록 → 엔진 연결, MY 요약)
                 discovery(발견 검색·필터·제안) · storage(로컬 저장 공통·초기화) · records · feedback · saved · activity
  types/         도메인 타입 (Mood, Duration, Category, Experience, OffrouRecord)
  styles/        tokens.css(디자인 토큰·다크모드), global.css
  pwa/           서비스 워커 등록
public/          manifest.webmanifest, sw.js, icons/
```

- 브랜드 컬러는 미확정 → `src/styles/tokens.css`의 `--brand-*` 값만 바꾸면 전체 반영.
- 다크모드: 시스템 설정을 따르며 `<html data-theme="light|dark">`로 강제 가능.
- 선택값과 현재 추천은 `/app/ready?mood=…&time=…&pick=…` URL 쿼리로 전달 → 새로고침해도 유지.
- 경험 추가: `src/data/experiences/<카테고리>.ts`에 항목(태그 포함)만 추가하면 추천·발견·검색에 자동 반영.
- 발견 필터는 URL에 남는다: `/app/discover/:카테고리?q=&time=&place=`.
- 실행 방식은 경험의 `interaction` 데이터로 정한다. 새 EXPERIENCE 이야기는 `src/data/stories/`에 데이터 파일을 추가하고 등록하면 공통 엔진으로 실행된다.

## 계정·동기화 (선택 기능, 6단계)

로그인하지 않아도 모든 기능을 쓸 수 있다. 계정을 만들면 다른 기기에서도 기록을 이어볼 수 있다.

1. [Supabase](https://supabase.com) 프로젝트를 만든다.
2. SQL Editor에서 `supabase/migrations/`의 파일을 이름 순서대로 실행한다 (`20261003…_offrou_user_data.sql`: 테이블·RLS·계정 삭제 함수, `20261004…_offrou_courses.sql`: 코스 기록·저장한 코스).
3. Authentication → URL Configuration: Site URL을 배포 주소로, Redirect URLs에 `<배포 주소>/app/account`, `<배포 주소>/app/account/reset` (개발: `http://localhost:5173/app/account`, `http://localhost:5173/app/account/reset`)을 추가한다. (예전 `/account…` 링크는 자동으로 `/app/account…`로 이동)
4. `.env.example`을 `.env.local`로 복사해 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`(공개 키)를 채운다. service_role/secret 키는 절대 넣지 않는다.

- 환경변수가 없으면 계정 기능만 꺼지고 비회원 OFFROU는 그대로 동작한다.
- 기록은 이 기기에 먼저 저장되고(local-first) 로그인 중이면 계정과 병합 동기화된다 (`src/services/sync`).
- 인증·원격 저장은 `src/services/account/types.ts`의 인터페이스 뒤에 있다 (Supabase 구현 / 테스트용 메모리 구현).

## 개인화 (이 기기 안에서만)

- 저장 키는 모두 `offrou.` 접두사 (localStorage: records · feedback · saved · activity / sessionStorage: session).
- 개인정보(이름·연락처·위치·나이·성별 등)는 받지도 저장하지도 않는다. 이야기 속 선택 내용도 저장하지 않는다.
- MY 하단 "내 OFFROU 기록 초기화"로 모두 지울 수 있다.

## 확장 지점

- `src/services/recommendation.ts` — 추천 규칙/가중치. 상태+시간(`recommendExperience`) · 지금 딱 하나(`recommendInstant`) · 오늘의 OFFROU(`pickDaily`)가 공통 선택 단계(`pickFromPool`)를 공유
- `src/services/course.ts` — 작은 코스 생성 규칙 (시간 범위·분위기는 `src/data/courses.ts`)
- `src/services/experiences.ts` — 정적 데이터 → 콘텐츠 API 교체
- `src/services/records.ts` — localStorage → 선택적 계정 동기화
- `src/features/experience/runners/index.ts` — 새 실행 방식 등록
- `src/features/experience/story/engine.ts` — 이야기 엔진 확장 (조건 분기 등)
- `src/data/site.ts` — 회사·문의·약관 정보, 홈페이지에 보일 경험 목록
- `src/features/site/` — 홈페이지 섹션 (약관·개인정보처리방침 페이지, 문의 폼 등을 붙일 자리)
