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

## 구조

```
src/
  app/           라우트(router.tsx), 하단 내비게이션 항목(navigation.tsx)
  components/    layout(AppShell, BottomNav) / ui(ChoiceCard, Chip, Button, EmptyState, PageHeader)
  data/          moods · durations · categories · places — 선택지/카테고리 데이터
    experiences/ 경험 메타데이터·추천 정보 (카테고리별 파일, 32개)
    stories/     EXPERIENCE 인터랙티브 장면 데이터 (5편)
  features/      home · ready(추천 결과) · experience(상세·진행·완료) · discover · my
    experience/runners/  실행 방식별 실행기 (guide · rest · prompts · focus · story)
    experience/story/    인터랙티브 이야기 엔진(engine.ts) + 화면(StoryRunner)
  services/      experiences(콘텐츠 조회) · recommendation(추천 엔진, 순수 함수) · personalization(기록 → 엔진 연결, MY 요약)
                 storage(로컬 저장 공통·초기화) · records · feedback · saved · activity
  types/         도메인 타입 (Mood, Duration, Category, Experience, OffrouRecord)
  styles/        tokens.css(디자인 토큰·다크모드), global.css
  pwa/           서비스 워커 등록
public/          manifest.webmanifest, sw.js, icons/
```

- 브랜드 컬러는 미확정 → `src/styles/tokens.css`의 `--brand-*` 값만 바꾸면 전체 반영.
- 다크모드: 시스템 설정을 따르며 `<html data-theme="light|dark">`로 강제 가능.
- 선택값과 현재 추천은 `/ready?mood=…&time=…&pick=…` URL 쿼리로 전달 → 새로고침해도 유지.
- 경험 추가: `src/data/experiences/<카테고리>.ts`에 항목만 추가하면 추천·발견에 자동 반영.
- 실행 방식은 경험의 `interaction` 데이터로 정한다. 새 EXPERIENCE 이야기는 `src/data/stories/`에 데이터 파일을 추가하고 등록하면 공통 엔진으로 실행된다.

## 개인화 (이 기기 안에서만)

- 저장 키는 모두 `offrou.` 접두사 (localStorage: records · feedback · saved · activity / sessionStorage: session).
- 개인정보(이름·연락처·위치·나이·성별 등)는 받지도 저장하지도 않는다. 이야기 속 선택 내용도 저장하지 않는다.
- MY 하단 "내 OFFROU 기록 초기화"로 모두 지울 수 있다.

## 확장 지점

- `src/services/recommendation.ts` — 추천 규칙/가중치 (`recommendExperience` 입력·출력만 유지하면 UI 수정 불필요)
- `src/services/experiences.ts` — 정적 데이터 → 콘텐츠 API 교체
- `src/services/records.ts` — localStorage → 선택적 계정 동기화
- `src/features/experience/runners/index.ts` — 새 실행 방식 등록
- `src/features/experience/story/engine.ts` — 이야기 엔진 확장 (조건 분기 등)
