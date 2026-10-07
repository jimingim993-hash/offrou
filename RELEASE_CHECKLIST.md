# OFFROU 출시 체크리스트 (1차 버전)

> 코드 쪽 확인은 저장소의 자동 테스트·빌드로, 외부 설정은 이 문서대로 직접 확인한다.
> "미검증"은 실제 환경이 없어 확인하지 못한 항목이다.

## 1. 배포 전 (코드)

- [ ] `npm test` 전체 통과
- [ ] `npm run typecheck` 오류 0
- [ ] `npm run build` 성공 (`dist/sw.js`에 파일 목록·버전이 들어갔는지)
- [ ] `.env`·`.env.local`이 git에 없고, `dist`에 service_role·VAPID private key·CRON_SECRET 문자열이 없다

## 2. 환경변수

| 이름 | 용도 | 위치 | 필수 |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 주소 | 클라이언트(빌드) | 계정·동기화·문의·관리센터를 쓰려면 필수 |
| `VITE_SUPABASE_ANON_KEY` | 공개(anon/publishable) 키. RLS로 보호 | 클라이언트(빌드) | 위와 같음 |
| `VITE_SITE_URL` | canonical·og:url (실제 도메인) | 클라이언트(빌드) | 도메인 확정 후 |
| `VITE_OG_IMAGE` | 공유 이미지 | 클라이언트(빌드) | 선택 |
| `VITE_VAPID_PUBLIC_KEY` | 웹 푸시 공개 키 | 클라이언트(빌드) | 알림을 쓸 때만 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 푸시 발송 | **서버 (Edge Function secret)** | 알림을 쓸 때만 |
| `CRON_SECRET` | 발송 함수 호출 보호 | **서버 (Edge Function secret)** | 알림을 쓸 때만 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Edge Function 안에서만 | 서버 (Supabase가 자동 제공) | — |

⚠️ service_role 키·VAPID private key·CRON_SECRET은 `VITE_`로 시작하는 변수에 절대 넣지 않는다 (그러면 브라우저 번들에 들어간다).

## 3. Supabase (DB)

- [ ] **실행 전 백업** (Dashboard → Database → Backups 또는 `pg_dump`). 아래 마이그레이션은 새 테이블·열·제약만 추가하고 기존 데이터를 지우지 않지만, production에는 백업 후 적용한다.
- [ ] SQL Editor에서 `supabase/migrations/`를 **이름 순서대로** 실행
  1. `20261003…_offrou_user_data.sql` — 기록·저장·피드백·취향, RLS, 계정 삭제 함수
  2. `20261004…_offrou_courses.sql` — 코스
  3. `20261005…_offrou_push.sql` — 알림 구독 (알림을 안 쓰면 생략 가능)
  4. `20261006…_offrou_play_kind.sql` — 실행형 PLAY 기록
  5. `20261007…_offrou_hobby_kind.sql` — 실행형 HOBBY 기록
  6. `20261008…_offrou_support.sql` — 문의·운영자 관리센터
- [ ] RLS 확인: Table Editor에서 `offrou_*` 테이블 모두 "RLS enabled"
- [ ] Authentication → URL Configuration: Site URL = 실제 도메인, Redirect URLs에 `<도메인>/app/account`, `<도메인>/app/account/reset`
- [ ] (알림) Edge Function `send-new-time` 배포 + secret 등록 + pg_cron 등록 (README 참고)

### 최초 운영자 지정 (한 번만, 직접)

1. 운영자로 쓸 이메일로 `<도메인>/app/account`에서 **일반 회원가입** (메일 인증이 켜져 있으면 인증까지).
2. Supabase Dashboard → Authentication → Users에서 그 계정의 **User UID**를 복사.
3. SQL Editor에서 실행:
   ```sql
   insert into public.offrou_admins (user_id) values ('<복사한 User UID>');
   ```
4. `<도메인>/admin`에서 그 계정으로 로그인 → 관리센터가 보이면 완료.
   - 운영자 해제: `delete from public.offrou_admins where user_id = '<UID>';`
   - 앱 코드는 누구도 자동으로 운영자로 만들지 않는다. 권한은 이 테이블과 서버 함수 `is_offrou_admin()`으로만 판단한다.

## 4. 호스팅 (Vercel)

- 배포: Vercel 프로젝트 `offrou` (팀 simplow), production 주소 **https://offrou.vercel.app** — `vercel deploy --prod`로 배포.
- `vercel.json`: 실제 파일이 없는 모든 경로 → `/index.html` (`/`, `/app/...`, `/admin` 직접 접속·새로고침 가능, 정적 파일이 먼저).
- 캐시: `/assets/*` 1년(immutable), `/sw.js`·`/index.html`·manifest는 no-cache. `/admin`은 X-Robots-Tag noindex. HTTPS는 Vercel 기본.
- [ ] 환경변수는 Vercel Dashboard → Project → Settings → Environment Variables (Production)에 넣고 **다시 배포**해야 반영된다 (VITE_ 변수는 빌드 때 들어간다).
- [ ] 자체 도메인을 쓰면 Vercel에 연결한 뒤 `VITE_SITE_URL`과 Supabase Site URL·Redirect URLs를 그 도메인으로.

## 5. 정책·사이트 정보 (출시 전 직접 확정 — 코드에 임의로 넣지 않았다)

- [ ] 문의 이메일 (`src/data/site.ts`의 연락처, 지금은 "준비 중"으로 보임)
- [ ] 운영자/사업자 정보 (필요한 경우)
- [ ] 이용약관 (지금 없음 — 홈페이지 푸터에 "준비 중" 표시)
- [ ] 개인정보처리방침 (지금 없음). OFFROU가 실제로 다루는 정보:
  - 비회원: 이 기기의 localStorage에만 사용 기록·저장·설정 (서버로 보내지 않음)
  - 로그인: 이메일(인증), 완료 기록(제목·카테고리·시간·결말 제목), 저장, 피드백, 취향 신호, 코스 기록
  - 알림을 켠 경우: 푸시 구독 정보(endpoint·공개키), 고른 시간·빈도·시간대
  - 문의: 유형·제목·내용·(선택) 이메일·앱 버전·화면 경로·브라우저 종류·OS·설치형 여부·화면 크기·(있으면) 콘텐츠 id/버전·오류 코드, 빈도 제한용 날짜별 접속 주소 해시
  - 수집하지 않음: 위치·사진·마이크·작성한 글/그림·이름·연락처(문의 이메일 제외)
- [ ] 계정 삭제 시 문의 기록 처리 정책 (지금: 문의는 남고 `user_id`만 비워짐 — 정책으로 확정 필요)
- [ ] 문의 데이터 보관 기간·삭제 정책
- [ ] 법률·행정 검토 (전자상거래·개인정보 관련 의무 여부)

## 6. 배포 후 직접 확인 (production URL)

- [ ] 1. 대표 URL 접속 → 2. 홈페이지 표시 → 3. "OFFROU 시작하기" → 4. `/app` 이동
- [ ] 5. HOME 6개 카드 각각 → 시간 → 추천 → 시작
- [ ] 6. PLAY·HOBBY·REST·EXPERIENCE·OUT 각각 하나씩 끝까지 → 7. MY 기록
- [ ] 8. 새로고침 후 기록 유지
- [ ] `/app/my`, `/app/experience/exp-bookstore`, `/admin`을 **주소창에 직접 입력·새로고침** → 404 없음
- [ ] 9. PWA 설치 (Android Chrome 설치 버튼 / iPhone Safari 공유 → 홈 화면에 추가) → 10. 설치 아이콘으로 열면 `/app`
- [ ] 11. 로그인 → 12. 다른 기기에서 같은 계정 로그인 → 기록이 보임
- [ ] 13. 비행기 모드에서 설치 앱 열기 → HOME·콘텐츠 실행 가능, 오프라인 안내 표시
- [ ] 14. (알림 사용 시) MY → 알림 받기 → 정한 시간에 알림 도착
- [ ] **데이터 보존 배포 테스트**: 기록 하나 만들기 → 새 버전 배포 → 다시 접속(업데이트 안내 → 업데이트) → 기록·저장·설정 그대로
- [ ] 문의 접수(비회원) → 접수번호 표시 → `/admin`에 표시

### 운영자 관리센터

- [ ] `/admin` 직접 접속 · 새로고침
- [ ] 비로그인 → 운영자 로그인 화면 (데이터 없음)
- [ ] 일반 회원으로 로그인 → "운영자 권한이 없어" (데이터 없음)
- [ ] 운영자 로그인 → 현황·목록 표시
- [ ] 신규 문의 확인 → 상세 → 상태 "확인 중" → 내부 메모 → "처리 중" → "처리 완료"
- [ ] 로그인 사용자의 "내 문의"에서 상태·답변 확인
- [ ] 운영자 로그아웃 → 데이터가 화면에 남지 않음
- [ ] 휴대폰 브라우저에서 `/admin` 위 과정 반복

## 7. 향후 요금제(FREE/PLUS/PREMIUM) 확장 메모 (구현하지 않음)

- 지금 콘텐츠는 모두 무료로 열려 있고 잠금 코드가 없다.
- 추가할 때의 제안: `profiles(user_id, plan text check (plan in ('free','plus','premium')) default 'free')` 테이블 + RLS(본인 조회), 콘텐츠 데이터에 선택 필드 `plan?: 'free' | 'plus' | 'premium'`(없으면 free).
  권한 판단은 운영자처럼 서버 함수로 하고, 기존 기록·저장은 plan과 무관하게 유지한다.
