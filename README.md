# Material Media — Motif & Pattern Generator

뉴미디어 아트 보존·아카이빙 서비스 **Material Media**의 그래픽 시스템을 직접 조작하며 탐색하는 웹 도구입니다.
데이터센터 랙의 서버를 넣고 빼는 행위를 아카이브 서랍을 밀고 넣고 쌓는 행위로 치환한 다섯 가지 모티프
(Stack · Pull · Wave · Spread · Portal)를 클릭과 스크롤로 만들어 볼 수 있습니다.

- **Explore** — 모티프 하나가 화면을 채우고, 스크롤하면 반복·흐름이 이어집니다. `Sequence`는 다섯 모티프를 서사 순서로 잇습니다.
- **Create** — 사이드바에서 조합을 고른 뒤 화면을 클릭하면 클릭 지점에서 패턴이 펼쳐집니다.
  `mix`는 여러 모티프의 요소를 섞어 클릭할 때마다 새로운 패턴을 만듭니다.

## 단축키

| 키 | 동작 |
|---|---|
| `1`–`5` | 모티프 전환 |
| `6` | Sequence (Explore) |
| `Space` | 재생 / 정지 |
| `R` | 새 seed |
| `Shift+R` | Create 화면 지우기 |
| `H` | 사이드바 숨기기 |

## 개발

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Vitest
npm run build     # 타입 검사 + 빌드 → dist/
npm run preview   # 빌드 결과 실행 → http://localhost:4173/material-media-motif-generator/
```

## 배포

`main` 브랜치에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 테스트·빌드 후 GitHub Pages에 자동 배포합니다.
처음 한 번만 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정하세요.

## 오프라인(전시장) 실행

폰트를 포함한 모든 리소스가 프로젝트에 들어 있어 인터넷 없이 실행됩니다.

```bash
npm install && npm run build && npm run preview
```
