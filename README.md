# GAMDO 아이패드

`index.html`은 GitHub Pages에서 실제 입력 화면으로 이동하는 진입점입니다.
`public/`에는 입력 화면과 꽃 그래픽, `src/`·`server/`에는 인증·분석·저장 서버가 있습니다.

- 아이패드: https://ahyeonk2.github.io/gamdo_ipad/
- 입력 서버: https://gamdo-tablet.gamdo-ahyeonk2.workers.dev/
- 정원: https://ahyeonk2.github.io/gamdo/

## 화면과 인쇄
결과 화면은 정원 상세 패널과 같은 제목·분석·영화 포스터·6축·컬러 구조의 HTML입니다. 긴 분석 원문을 유지하며, PNG는 인쇄 버튼을 누를 때만 생성합니다. 정원 상세 탭을 숨기는 현재 동작은 유지합니다.

## 배포
`npm install`, `npm run check`, `npm run deploy`. Cloudflare 로그인 권한이 있는 계정에서 실행하세요. API 키와 전시 비밀번호는 Cloudflare Secret에만 보관하고 GitHub에는 올리지 않습니다. 기존 서버의 Secret과 데이터베이스를 그대로 사용합니다.
