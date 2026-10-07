# OFFROU 앱 아이콘 — 공식 로고 기반

이 폴더의 아이콘은 **OFFROU 공식 로고의 심볼**(원 + 바깥으로 빠져나가는 경로 + 작은 점)로 만들었다.
원본 로고는 `public/brand/`에 있다. 로고가 바뀌면 같은 이름·크기로 다시 만든다 (manifest·index.html은 수정할 필요 없음).

| 파일 | 크기 | 용도 | 만든 방법 |
|---|---|---|---|
| `icon-192.png` | 192×192 | 안드로이드 홈 화면·설치 대화상자 | 어두운 배경(#222227) 위 심볼 66% |
| `icon-512.png` | 512×512 | 안드로이드 스플래시·큰 아이콘 | 위와 같음 |
| `icon-maskable-512.png` | 512×512 | 안드로이드 적응형(원·물방울 등으로 잘림) | 심볼 52% → 가운데 안전 영역 안 |
| `apple-touch-icon.png` | 180×180 | iPhone·iPad 홈 화면 | 불투명 배경, 모서리는 iOS가 둥글게 |
| `favicon-32.png` · `favicon-48.png` | 32 · 48 | 브라우저 탭 | 둥근 어두운 배경 위 심볼 (밝은 탭에서도 보이게) |

## 브랜드 원본 (`public/brand/`)

| 파일 | 용도 |
|---|---|
| `offrou-logo-dark.png` | 전체 로고(심볼 + OFFROU), **어두운 배경용** (밝은 글자) |
| `offrou-logo-light.png` | 전체 로고, **밝은 배경용** (어두운 글자) |
| `offrou-wordmark-dark.png` · `offrou-wordmark-light.png` | 워드마크만 |
| `offrou-symbol.png` | 심볼만 (투명 배경) |
| `offrou-app-icon.png` | 1024 앱 아이콘 원본 |

화면에서는 직접 넣지 말고 `src/components/brand/BrandLogo.tsx`를 쓴다.
