# GAMDO 아이패드 입력·분석 서버

전시 공통 비밀번호로 입장하고 영화 선택→감상→꽃 생성→영수증 인쇄→정원 심기를 제공합니다. Cloudflare Workers와 D1에 배포합니다.

## 먼저 읽기

[배포 순서와 설정 안내](DEPLOYMENT.md)를 따라 아이패드 저장소를 먼저 배포하고, 정원 저장소를 연결하세요. GitHub Pages 전용 프로젝트가 아닙니다.

## 명령

```sh
npm install
npm run check
npm run dev
```

`npm run deploy` 전 `wrangler.json` 설정을 채워야 합니다. 실제 비밀번호·API 키는 `wrangler secret put`으로 서버에 저장합니다. `.dev.vars.example`은 로컬 실행용 예시이며 실제 `.dev.vars`는 업로드하지 않습니다.

## 파일

- `public/`: 현재 GAMDO의 화면·폰트·생성형 SVG 그래픽
- `src/worker.mjs`: 이 저장소의 서버 진입점
- `wrangler.json`: Cloudflare 배포 설정
- `tests/`: 외부 API 비용 없이 실행하는 동작 확인

현재 운영 중인 Sites와는 독립된 복사본입니다.
