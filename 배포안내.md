# GAMDO — GitHub 저장소 두 개로 배포하기

이 파일 묶음은 **현재 Sites와 별개로 배포하는 전시용 버전**입니다. 운영 중인 Sites는 변경하지 않았습니다.

## 파일과 역할

| 폴더 / GitHub 저장소 | 배포 후 역할 |
| --- | --- |
| `gamdo-tablet` | 아이패드 UI, 공통 비밀번호 입장, 영화 검색, LLM 분석, 꽃 생성, 영수증·인쇄, 데이터 저장 서버 |
| `gamdo-garden` | 벽 화면용 정원 UI, 꽃 이동·개화 애니메이션, 새 꽃과 요약 표시 |

두 개 모두 **Cloudflare Workers + Static Assets**에 배포하도록 구성했습니다. 아이패드 쪽에서만 **D1 데이터베이스 한 개**를 사용합니다. 정원 쪽은 아이패드 서버를 읽으므로 두 저장소의 DB를 따로 만들면 안 됩니다.

```text
아이패드 → 아이패드 서버 → OpenAI / TMDB
                       ↓
                  공유 D1 저장소
                       ↓
벽 정원 → 정원 서버 → 아이패드의 공개용 꽃 API
```

GitHub는 소스 보관 장소입니다. **GitHub Pages만으로는 서버·LLM 분석·D1 저장 기능이 작동하지 않습니다.** 아래 순서로 Workers에 배포하세요.

## 1. GitHub에 올리기

`gamdo-tablet`, `gamdo-garden` 폴더를 각각 별도 저장소로 올립니다. GitHub Desktop을 쓰면 각 폴더를 별도 로컬 저장소로 추가한 뒤 Publish repository를 선택하면 됩니다.

ZIP 자체를 저장소에 올리는 것이 아니라, **ZIP을 풀어서 그 안의 파일들**을 올립니다. 각 저장소 최상단에 `package.json`, `wrangler.json`, `README.md`가 있어야 합니다.

API 키, 공통 비밀번호, 정원 연결 키는 파일에 포함하지 않았습니다. `.dev.vars.example`은 설정 이름만 있는 예시입니다. 실제 `.dev.vars`는 Git에서 제외됩니다.

## 2. 아이패드 저장소 배포

Node.js 22.13 이상과 Cloudflare 계정이 필요합니다. 터미널에서 `gamdo-tablet` 폴더로 이동합니다.

```sh
npm install
npx wrangler login
npm run db:create
```

마지막 명령이 출력한 `database_id`를 복사해 아래 `실제_DB_ID` 자리에 넣습니다.

```sh
node scripts/configure.mjs --database-id 실제_DB_ID
npm run db:remote
npm run deploy
```

처음 배포되면 아이패드 사이트 주소가 출력됩니다. 이어서 아래 명령을 **하나씩** 실행하고, 물어볼 때 값을 입력합니다. 키와 비밀번호는 화면에 그대로 출력되지 않습니다.

```sh
npx wrangler secret put EXHIBITION_PASSWORD
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put TMDB_READ_ACCESS_TOKEN
npx wrangler secret put GARDEN_SYNC_KEY
```

- `EXHIBITION_PASSWORD`: 관람객에게 안내할 전시 공통 비밀번호
- `OPENAI_API_KEY`: 사용할 OpenAI API 키. 기존 키를 계속 사용할 수 있습니다.
- `TMDB_READ_ACCESS_TOKEN`: TMDB의 API 읽기 액세스 토큰
- `GARDEN_SYNC_KEY`: 두 서버 사이 연결용 비밀값. 전시 입장 비밀번호와 다르게 정하고, 다음 단계의 정원 서버에도 **똑같이** 입력합니다. 충분히 긴 임의 문자열을 사용합니다.

아이패드는 배포된 주소의 `/create` 또는 첫 화면 `/`을 엽니다. 비밀번호 입장 화면이 나온 뒤 기존 영화 입력 화면으로 이어집니다.

## 3. 정원 저장소 배포

터미널에서 `gamdo-garden` 폴더로 이동합니다. 아래 주소 예시는 실제 아이패드 주소로 바꿉니다.

```sh
npm install
node scripts/configure.mjs --tablet-origin https://아이패드주소.workers.dev
npm run deploy
npx wrangler secret put GARDEN_SYNC_KEY
```

마지막에는 아이패드 서버에 입력했던 **동일한 `GARDEN_SYNC_KEY`**를 입력합니다. 여기에는 OpenAI 키, TMDB 토큰, 전시 비밀번호를 설정하지 않습니다.

벽 화면에서는 정원 주소의 `/garden` 또는 첫 화면 `/`을 엽니다. 정원은 약 4초 간격으로 새 꽃을 확인하고, 새 꽃이 피어난 뒤 해당 꽃의 상세 탭을 우선 표시합니다.

## 4. 연동 확인

1. 아이패드 주소에서 공통 비밀번호로 입장합니다.
2. 영화 세 편을 선택하고 각각 40자 이상 감상평을 씁니다.
3. 꽃을 생성한 뒤 영수증을 확인합니다.
4. ‘정원에 내 꽃 심기’를 누릅니다.
5. 벽 정원에서 새 꽃과 짧은 요약이 나타나는지 봅니다.

정원 API는 감상평 원문·추가 답변·인용 근거를 전달하지 않습니다. 꽃의 제목, 공개용 요약, 도형·색상 값, 영화 메타데이터를 전달합니다. 기존 설계와의 호환을 위해 공개되어 있던 전체 설명도 서버 데이터에는 유지되지만, 정원 탭은 별도 `summary`를 사용합니다.

## 현재 사이트와 달라지는 부분

- ChatGPT 전용 로그인은 외부 호스팅에 옮길 수 없어, 선택하신 **전시 공통 비밀번호 입장**으로 바꿨습니다.
- 공통 비밀번호 입장마다 별도 세션을 만듭니다. 개인 계정 서비스가 아니며, 같은 로그인 세션을 여러 관람객이 이어 쓰면 해당 기기의 저장 기록을 공유합니다. 새로운 세션이 필요하면 다시 `/login`에서 입장하세요.
- 현재 공개 정원의 꽃 스냅샷은 DB 초기 데이터에 포함했습니다. 비공개 리뷰 원문·추가 답변·기존 계정·기존 로그인 세션은 내보내지 않았습니다.
- 현재 Sites의 API 키·DB·결제 설정은 새 배포에 자동 복사되지 않습니다. 비밀값은 위 명령으로 직접 설정해야 합니다.
- 호스팅 플랫폼의 ‘사이트 피드백’ 위젯을 넣는 코드가 없는 독립 Workers 버전입니다.

## 설정을 바꿀 때

`gamdo-tablet/wrangler.json`에서 분석 모델과 사용 한도를 바꿀 수 있습니다. 기본값은 입장 세션당 시간 50회·하루 300회, 전시 전체 하루 300회입니다. LLM 분석·추가질문이 사용 횟수에 포함됩니다. 새 입장 세션을 만들면 세션별 횟수는 새로 계산되며, 전시 전체 한도는 유지됩니다.

비밀번호 변경은 `wrangler secret put EXHIBITION_PASSWORD`를 다시 실행합니다. 기존 입장 세션은 비밀번호 변경 뒤 무효화됩니다. 로그인 시도는 IP별 15분 동안 15회로 제한합니다.

두 서버의 연결 키를 바꿀 때는 두 저장소에서 `GARDEN_SYNC_KEY`를 같은 값으로 바꿉니다. API 키를 브라우저 코드나 GitHub 파일에 적지 마세요.

## 로컬 실행

각 폴더의 `.dev.vars.example`을 `.dev.vars`로 복사해 실제 로컬 설정을 입력합니다. 아이패드 폴더에서 `npm run db:local` 후 `npm run dev`를 실행합니다. 정원 폴더에서는 아래처럼 실행합니다.

```sh
npm run dev -- --port 8788 --var TABLET_ORIGIN:http://localhost:8787
```

두 `.dev.vars`의 `GARDEN_SYNC_KEY`가 같아야 합니다. 브라우저에서는 아이패드 `http://localhost:8787/create`, 정원 `http://localhost:8788/garden`을 사용합니다.

## 수정할 파일

| 변경할 내용 | 파일 |
| --- | --- |
| 아이패드 레이아웃·문구·버튼 | `gamdo-tablet/public/garden.html`, `garden.css`, `garden.js` |
| 정원 배치·움직임·탭 | `gamdo-garden/public/garden-layout.js`, `garden-motion.js`, `garden.js`, `garden.css` |
| 분석 기준·문체·요약 길이 | `gamdo-tablet/analysis-contract.mjs` |
| 영수증 PNG 레이아웃·글꼴 | `gamdo-tablet/public/ticket-image.js` |
| 꽃 모양·그래픽 생성 규칙 | 양쪽 저장소의 `public/engine.js`, `generator-adapter.js` 및 관련 생성 파일 |

꽃 생성 규칙을 바꾸는 경우 양쪽 저장소의 생성 파일을 함께 반영해야 동일한 꽃이 보입니다. 현재 두 저장소에는 같은 생성기·폰트·그래픽 파일을 넣었습니다.

## 확인한 범위

공통 비밀번호 입장, 인증되지 않은 분석 차단, 비밀번호 변경 시 세션 무효화, 로그인 횟수 제한, 분석→기존 SVG 생성기→심기→정원 읽기 흐름을 자동 확인했습니다. 두 Worker의 배포 파일 생성도 확인했습니다. 자동 확인의 LLM/TMDB 응답은 테스트용 응답이므로 비용이 발생하는 실제 API 호출이나 실제 배포를 실행한 것은 아닙니다. 외부 배포 후 실제 API 응답 시간과 79mm 프린터 인쇄는 사용 환경에서 확인해야 합니다.
