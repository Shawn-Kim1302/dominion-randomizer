# 기술 스택 설명

이 프로젝트(도미니언 랜더마이저)가 어떤 기술로 만들어졌고, 폴더와 파일이 어떻게 나뉘어 있으며, 코드를 고치면 사이트까지 어떻게 반영되는지 정리한 문서입니다. 웹 개발을 처음 접하는 사람을 기준으로 썼습니다.

- 사이트 주소: https://shawn-kim1302.github.io/dominion-randomizer/
- 저장소: https://github.com/Shawn-Kim1302/dominion-randomizer (public)

> 버전 숫자는 `package.json`의 범위(`^3.5.13` 같은)가 아니라 `package-lock.json`에 기록된, 실제로 설치되는 버전입니다. 파일 수, 카드 수, 테스트·빌드 결과는 2026-11-20에 직접 세거나 실행해서 확인했습니다. 저장소 공개 여부, Actions 실행 결과, 사이트 응답도 같은 날 GitHub 공개 API와 사이트에 직접 접속해 확인했습니다.

## 한눈에 보기

| 구분 | 사용한 것 | 버전 | 하는 일 |
|---|---|---|---|
| 화면 구조·모양 | HTML, CSS | - | 화면의 뼈대와 색, 여백, 배치, 휴대폰 화면·다크 모드 대응 |
| 언어 | TypeScript | 5.7.3 | 타입을 붙인 JavaScript. 앱 코드와 스크립트 전체 |
| 화면 프레임워크 | Vue 3 | 3.5.45 | 값이 바뀌면 화면을 자동으로 다시 그림 |
| 빌드 도구 | Vite (+ `@vitejs/plugin-vue`) | 6.4.6 (5.2.4) | 개발용 서버, 배포용 파일(`dist/`) 만들기 |
| 타입 검사 | `vue-tsc` | 2.2.12 | 빌드 전에 `.ts`, `.vue` 코드 실수 찾기 |
| 테스트 | Vitest | 2.1.9 | 뽑기·규칙 로직이 맞는지 자동 확인 |
| 스크립트 실행 | `tsx` | 4.23.15 | 카드 데이터 생성 스크립트를 빌드 없이 실행 |
| 실행 환경·패키지 관리 | Node.js, npm | 22 (확인한 PC: 22.21.1, npm 10.9.4) | 개발 도구 설치와 명령 실행 (내 컴퓨터와 GitHub 서버에서만) |
| 상태 저장 | 브라우저 `localStorage` | - | 선택한 확장, 필터, 최근 결과를 새로고침 후에도 유지 |
| 글꼴 | Google Fonts | - | 고운바탕, Noto Sans KR 글꼴 불러오기 |
| 코드 보관 | Git, GitHub | - | 변경 이력 관리와 원격 저장 |
| 자동화·배포 | GitHub Actions → GitHub Pages | - | `main`에 푸시하면 테스트·빌드 후 자동 공개 |

사용하지 **않은** 것: 서버, 데이터베이스, 로그인, 화면 이동 라이브러리(Vue Router), 상태 관리 라이브러리(Pinia, Vuex), UI 부품 라이브러리. 실제로 사이트에 들어가는 외부 라이브러리는 `vue` **하나뿐**이고, 나머지는 전부 개발할 때만 쓰는 도구입니다. 모든 계산은 접속한 사람의 브라우저에서 일어나고, 카드 데이터는 빌드할 때 앱 코드에 함께 묶입니다.

## 1. 프로젝트 구조

Git이 관리하는 파일은 모두 **36개**입니다(`git ls-files` 기준, 이 문서 제외). `node_modules/`, `dist/`, `.cache/`는 다시 만들 수 있는 폴더라 Git에 올리지 않습니다(`.gitignore`).

```
dominion-randomizer/
├── index.html               사이트의 첫 HTML. 빈 자리(#app)와 Google Fonts, src/main.ts 불러오기
├── package.json             사용하는 패키지 목록과 npm 명령
├── package-lock.json        실제 설치 버전 기록
├── tsconfig.json            TypeScript 설정
├── vite.config.ts           Vite 설정 (사이트 경로, Vue 플러그인)
├── .github/workflows/
│   └── deploy.yml           GitHub Pages 자동 배포 워크플로
├── scripts/                 카드 데이터 JSON을 만드는 스크립트 (사람이 가끔 직접 실행)
│   ├── build-data.ts            cards.json, sets.json 생성
│   └── build-recommended.ts     recommended.json 생성
└── src/                     앱 코드 (27개 파일)
    ├── main.ts              앱 시작점. Vue 앱을 만들어 #app에 붙임
    ├── App.vue              화면 전체와 앱 상태. 뽑기 버튼 처리
    ├── style.css            공통 색(CSS 변수), 다크 모드, 기본 글꼴
    ├── lang.ts              카드 이름 표시 언어(한/영) 상태
    ├── storage.ts           localStorage 읽기/쓰기
    ├── env.d.ts             .vue 파일을 TypeScript가 이해하도록 하는 타입 선언
    ├── components/          화면 부품 6개 (.vue)
    ├── data/                카드 데이터(JSON 4개)와 그것을 읽는 코드
    │   ├── cards.json           카드 814종 (약 230KB)
    │   ├── sets.json            확장(박스) 24개
    │   ├── recommended.json     공식 추천 왕국 500개 (약 181KB)
    │   ├── ko-overrides.json    한국어 이름 수동 수정 15개
    │   ├── types.ts             카드·확장의 데이터 모양 정의
    │   ├── index.ts             JSON을 불러와 조회 함수 제공
    │   └── recommended.ts       추천 왕국 데이터 모양과 불러오기
    └── randomizer/          화면과 무관한 뽑기·규칙 로직 (테스트 대상)
        ├── rng.ts               난수 생성기, 섞기
        ├── kingdom.ts           뽑을 수 있는 카드 모으기, 공식 뽑기 절차, 정렬
        ├── constraints.ts       필터·조건을 지키는 뽑기, 한 장 다시 뽑기
        ├── setup.ts             공식 세팅 규칙 적용(Bane, 백금/식민지 등), 저장용 변환
        ├── components.ts        필요한 추가 구성물 규칙 27개, 카드별 세팅 안내 12개
        └── *.test.ts            테스트 3개 파일
```

큰 흐름은 **데이터(`data/`) → 규칙(`randomizer/`) → 화면(`App.vue`, `components/`)** 입니다. 화면 코드는 규칙 코드를 부르기만 하고, 규칙 코드는 화면을 전혀 모릅니다. 그래서 규칙은 화면 없이 테스트할 수 있습니다(9장).

## 2. HTML, CSS, JavaScript와 TypeScript

웹 페이지는 HTML(뼈대), CSS(모양), JavaScript(동작) 세 가지로 이루어집니다. 브라우저가 이해하는 것은 이 셋뿐입니다.

이 프로젝트의 [`index.html`](../index.html)은 거의 비어 있습니다. `<div id="app"></div>`라는 빈 자리와, 그 자리를 채울 프로그램(`src/main.ts`)을 불러오는 한 줄이 전부입니다. 실제 화면은 `src/` 아래 코드가 실행되면서 만들어집니다.

```html
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

[`src/main.ts`](../src/main.ts)는 다섯 줄짜리 시작점입니다. Vue 앱을 만들고(`createApp(App)`), 공통 CSS를 불러온 뒤, `#app` 자리에 붙입니다(`mount('#app')`).

| 직접 쓰는 것 | 최종적으로 바뀌는 것 |
|---|---|
| TypeScript (`.ts`) | JavaScript |
| Vue 컴포넌트 (`.vue`)의 `<template>` | 화면의 HTML을 만드는 JavaScript |
| `.vue`의 `<style scoped>`, `style.css` | CSS |
| `src/data/*.json` | JavaScript 안의 데이터 |

그래서 **빌드**라는 변환 과정이 필요합니다(6장). 이런 앱을 **SPA(Single Page Application)** 라고 합니다. `index.html` 하나와 JS 파일을 받은 뒤에는 새 페이지를 받지 않고 JavaScript가 화면을 바꿉니다.

### TypeScript
JavaScript에 **타입**(이 변수에는 숫자만, 이 함수는 카드 목록을 받는다 등)을 적을 수 있게 한 언어입니다. 파일 확장자는 `.ts`입니다.

```ts
function primaryName(card: Card): string { ... }  // Card를 받아 문자열을 돌려준다
```

- 장점: 오타나 잘못된 값 전달을 **실행하기 전에** 찾아 줍니다. 카드 814종의 데이터 구조(`src/data/types.ts`)를 다루는 이 프로젝트에서 특히 유용합니다.
- 단점: 브라우저는 TypeScript를 직접 실행하지 못합니다. 그래서 배포 전에 JavaScript로 바꾸는 빌드가 필요합니다.

설정은 [`tsconfig.json`](../tsconfig.json)에 있습니다.

- `"strict": true`: 가장 엄격한 검사. `noUnusedLocals`, `noUnusedParameters`로 쓰지 않는 변수나 인자도 오류로 처리합니다.
- `"resolveJsonModule": true`: `import cardsJson from './cards.json'`처럼 JSON을 코드로 불러올 수 있게 합니다.
- `"noEmit": true`: TypeScript는 검사만 하고 JavaScript 파일은 만들지 않습니다. 변환은 Vite가 합니다.
- `include`: `src/`, `scripts/`, `vite.config.ts`를 모두 검사합니다.

## 3. Vue 3와 화면 구성

화면을 만드는 **프레임워크**입니다. 프레임워크는 "화면을 어떻게 짜고 갱신할지"에 대한 틀과 도구 묶음이라고 생각하면 됩니다. React와 같은 역할을 하는 다른 제품입니다.

### 값이 바뀌면 화면이 따라 바뀐다
Vue의 핵심은 **반응성(reactivity)** 입니다. `ref()`로 만든 값을 바꾸면, 그 값을 쓰는 화면 부분을 Vue가 알아서 다시 그립니다.

```ts
export const lang = ref<'ko' | 'en'>('ko')   // src/lang.ts

lang.value = 'en'   // 이것만 하면 카드 이름이 전부 영어로 바뀐다. 화면 갱신 코드를 따로 부르지 않는다
```

이 프로젝트에서 자주 보이는 Vue 기능입니다.

| 기능 | 뜻 | 이 프로젝트의 예 |
|---|---|---|
| `ref()` | 바뀌면 화면이 따라 바뀌는 값 | `App.vue`의 `selected`(고른 확장), `players`(인원), `setup`(뽑은 결과) |
| `computed()` | 다른 값에서 계산되는 값. 원래 값이 바뀌면 자동 재계산 | `pool`(고른 확장의 왕국 카드), `CardTile.vue`의 테두리 색 `band` |
| `watch()` | 값이 바뀔 때마다 할 일 | 설정이 바뀌면 `saveState()`로 localStorage에 저장 |
| `defineProps` / `defineEmits` | 부모에게서 받는 값 / 부모에게 보내는 신호 | `CardTile`이 `card`를 받고 `reroll` 신호를 보냄 |
| `v-model` | 부모와 자식이 값을 함께 쓰기 | `<SetPicker v-model="selected" />` |
| `onMounted` / `onBeforeUnmount` | 화면에 붙을 때 / 떨어질 때 할 일 | 전체 화면 해제 감지 이벤트 등록·해제 |

### `.vue` 파일 (단일 파일 컴포넌트)
화면을 「카드 한 장」, 「확장 선택 상자」처럼 부품(**컴포넌트**)으로 나누고, 부품 하나를 `.vue` 파일 하나에 씁니다. 한 파일 안에 세 부분이 들어갑니다.

```vue
<script setup lang="ts"> /* 동작 (TypeScript) */ </script>
<template> <!-- 화면 뼈대 (HTML과 비슷한 문법) --> </template>
<style scoped> /* 이 부품에만 적용되는 CSS */ </style>
```

| 파일 | 줄 수 | 화면에서 맡은 부분 |
|---|---|---|
| `src/App.vue` | 342 | 전체 화면 배치, 앱 상태, 뽑기·다시 뽑기·추천 불러오기·기록 복원 처리 |
| `src/components/SetPicker.vue` | 127 | 「확장」: 보유한 확장 선택, 프로모 카드 한 장씩 선택 |
| `src/components/FiltersPanel.vue` | 179 | 「조건」: 제외/필수 카드, 확장별 최소·최대, 능력 요구, 공격-방어, 비용 분산 |
| `src/components/RecommendedPanel.vue` | 69 | 「공식 추천 왕국」: 접었다 펴는 목록에서 골라 불러오기 |
| `src/components/CardTile.vue` | 100 | 카드 한 장 표시(이름, 비용, 종류 색 띠, 수록 확장)와 「다시 뽑기」 버튼 |
| `src/components/SetupPanel.vue` | 124 | 「세팅 체크리스트」: 추가 구성물, 카드별 세팅 안내, 경고 |
| `src/components/HistoryPanel.vue` | 48 | 「최근 결과」: 최근 20개 결과 다시 보기, 지우기 |

### 화면과 경로
이 앱은 **화면이 하나**이고 주소도 하나(`/dominion-randomizer/`)입니다. 페이지 이동이 없어서 Vue Router를 쓰지 않습니다. 화면은 이렇게 나뉩니다.

```
┌ 상단: 제목 · [한글 | English] 카드 이름 언어 전환 ───────────────┐
├ 왼쪽(side)                    ├ 오른쪽(result)                     ┤
│  게임: 인원(2~6), 랜드스케이프 방식 │  왕국: [비용순|가나다순] [크게 보기] [왕국 뽑기] │
│  확장: SetPicker               │   CardTile × 10 (+ Bane 등 추가 더미)   │
│  조건: FiltersPanel            │   랜드스케이프 · 동맹 · 예언 CardTile     │
│  공식 추천 왕국: RecommendedPanel │   세팅 체크리스트: SetupPanel          │
│                               │  최근 결과: HistoryPanel               │
└───────────────────────────────┴────────────────────────────────────┘
```

- **크게 보기**: 결과가 있을 때 나타나는 버튼입니다. 왼쪽 설정과 최근 결과를 숨기고 결과를 크게 보여 주며, 브라우저가 허락하면 전체 화면으로 바꿉니다(`App.vue`의 `toggleTableMode`). 전체 화면을 거부당해도 확대 배치는 적용됩니다.
- 휴대폰처럼 좁은 화면에서는 두 칸이 위아래로 쌓입니다(`App.vue`의 `@media` 규칙).
- 색은 [`src/style.css`](../src/style.css)의 `:root`에 CSS 변수(`--gold`, `--t-action` 등)로 모여 있고, `prefers-color-scheme: dark`로 기기가 다크 모드일 때 다른 색을 씁니다.

## 4. 상태 관리와 데이터 구조

### 상태(state)
"지금 앱이 기억하고 있는 데이터"입니다. 어떤 확장을 골랐는지, 몇 명이 하는지, 방금 뽑은 왕국이 무엇인지 같은 것입니다.

이 앱은 상태가 많지 않아서 별도 상태 관리 라이브러리 없이 **`App.vue` 안의 `ref()`** 로 관리합니다. 자식 부품에는 props로 내려 주고, 바뀐 값은 `v-model`이나 이벤트로 올려 받습니다. 예외는 카드 이름 언어 `lang` 하나로, 모든 `CardTile`이 써야 해서 [`src/lang.ts`](../src/lang.ts)에 모듈 전역 `ref`로 두고 필요한 곳에서 `import`합니다.

| 상태 (`App.vue`) | 뜻 | 저장 여부 |
|---|---|---|
| `selected` | 고른 확장 id와 프로모 키의 집합(`Set`). 처음엔 `dominion2ndEdition` | 저장 |
| `players` | 인원 2~6. 처음엔 2 | 저장 |
| `landscapeChoice` | 랜드스케이프 방식 `shuffled`/`fixed1`/`fixed2`/`none` | 저장 |
| `sortMode` | 왕국 정렬 `cost`(비용순)/`name`(가나다순) | 저장 |
| `constraints` | 필터·조건 (아래 `Constraints`) | 저장 |
| `lang` (`lang.ts`) | 카드 이름 표시 언어 `ko`/`en` | 저장 |
| `history` | 최근 결과 최대 20개 | 저장 |
| `setup` | 지금 화면에 보이는 뽑기 결과 (`GameSetup`) | 저장 안 함. 단, 뽑을 때마다 `history` 맨 앞에 들어감 |
| `error`, `tableMode` | 오류 문구, 크게 보기 여부 | 저장 안 함 |

### 카드 데이터: `src/data/`
카드 정보는 서버에서 받아 오지 않고 JSON 파일로 저장소에 들어 있습니다. [`src/data/index.ts`](../src/data/index.ts)가 이 JSON을 불러와 `cards`, `sets` 배열과 `getCard(id)`, `getSet(id)`, `setLabel()` 같은 조회 함수를 제공합니다. 데이터 모양은 [`src/data/types.ts`](../src/data/types.ts)에 정의돼 있습니다.

**카드(`Card`)** — `cards.json`에 814종. 예: 해자(Moat)

```json
{
  "id": "Moat", "en": "Moat", "ko": "해자",
  "sets": ["dominion1stEdition", "dominion2ndEdition"],
  "cost": { "coin": 2, "potion": 0, "debt": 0, "special": false },
  "types": ["Action", "Reaction"],
  "kind": "kingdom",
  "abilities": ["draw", "defense"]
}
```

- `id`: 카드의 고유 이름. dominiontabs의 `card_tag`를 그대로 써서 영어 이름과 같은 경우가 많습니다(`Moat`, `Black Market`). 앱의 모든 곳(저장, 필터, 추천 왕국)이 이 `id`로 카드를 가리킵니다.
- `sets`: 수록된 박스 id 목록. 1판과 2판에 모두 있는 카드는 둘 다 적힙니다. 동전·저주 같은 기본 카드는 `["base"]`입니다.
- `kind`: 카드 역할. 현재 개수는 `kingdom`(왕국 카드) 498, `landscape`(이벤트·랜드마크·프로젝트·Way·특성) 155, `ally`(동맹) 23, `prophecy`(예언) 15, `other`(백금, 폐허, 상 등 기타) 123입니다.
- `abilities`: 카드 문구에서 찾아낸 능력 `village`(+2 액션 이상), `buy`(+구매), `draw`(+2 카드 이상), `trash`(폐기), `defense`(공격 방어). 조건의 「능력 요구」, 「공격이 있으면 방어도」에 씁니다.
- 현재 데이터에는 한국어 이름(`ko`)이 빠진 카드가 없습니다(0종). 타입상으로는 `null`일 수 있고, 그때는 영어로 표시됩니다.

**확장(`CardSet`)** — `sets.json`에 24개. 예: 정복자의 바다 2판

```json
{ "id": "seaside2ndEdition", "expansion": "seaside", "edition": 2, "en": "Seaside", "ko": "정복자의 바다", "koPrint": false }
```

- `id`는 **박스** 단위입니다. 1판과 2판은 다른 박스(`seaside1stEdition`, `seaside2ndEdition`)이고, `expansion`(`seaside`)이 둘을 묶습니다. 판이 하나뿐인 확장은 `edition: 0`입니다.
- `koPrint`: 한국어판이 나온 박스인지. 24개 중 11개가 `true`입니다.
- 프로모(`promo`)는 한 장씩 팔리기 때문에 박스 대신 **카드별로** 고릅니다. 선택 키는 `promo:<카드 id>` 형식입니다(예: `promo:Black Market`, `kingdom.ts`의 `promoKey()`). 프로모 카드는 14종입니다.
- 「확장별 최소·최대」 조건은 박스가 아니라 확장 묶음 단위입니다(`index.ts`의 `groupOf()`). 2판에서 한 박스로 합쳐진 풍요의 뿔과 길드를 위하여는 `cornucopia-guilds` 하나로 셉니다.

**공식 추천 왕국(`RecommendedKingdom`)** — `recommended.json`에 500개. 예:

```json
{ "name": "First Game", "source": "base-set", "sets": ["dominion1stEdition"],
  "kingdom": ["Cellar", "Market", "Militia", "Mine", "Moat", "Remodel", "Smithy", "Village", "Woodcutter", "Workshop"],
  "landscapes": [] }
```

카드는 모두 `id`로 적혀 있습니다. 필요에 따라 `bane`, `ally`, `traits`, `colonies`(백금/식민지 사용), `shelters`(대피소 사용) 같은 칸이 더 붙습니다([`src/data/recommended.ts`](../src/data/recommended.ts)).

**`ko-overrides.json`** — 영어 이름 → 한국어 이름 15개를 손으로 적은 목록입니다(예: `"Hovel": "초가집"`). 데이터 생성 스크립트가 다른 자료보다 우선 적용합니다(8장).

### 뽑기 결과: `GameSetup`과 `SavedSetup`
「왕국 뽑기」를 누르면 [`src/randomizer/setup.ts`](../src/randomizer/setup.ts)의 `GameSetup`이 만들어집니다. 화면에 필요한 모든 정보가 카드 객체째로 들어 있습니다.

| 칸 | 뜻 |
|---|---|
| `kingdom` | 왕국 카드 10장 |
| `landscapes` | 랜드스케이프 |
| `extraPiles` | 카드 효과로 추가되는 더미와 이유(`role`): `bane`(젊은 마녀의 Bane), `approaching-army`, `ferryman`, `riverboat`, `mouse` |
| `traits` | 특성과 그것을 올려 둔 왕국 더미 |
| `ally`, `prophecy` | 연락책·징조 카드가 있을 때 쓰는 동맹·예언 카드 |
| `platinumColony`, `shelters` | 백금/식민지, 대피소 사용 여부와 그것을 결정한 무작위 카드(`decidedBy`) |
| `obeliskPile` | 오벨리스크가 고른 더미 |
| `components` | 필요한 추가 구성물(물약 더미, 폐허 더미, 매트, 토큰 …). `components.ts`의 규칙 27개로 계산 |
| `setupNotes` | 카드에 인쇄된 "Setup:" 안내 |
| `warnings` | 지킬 수 없었던 규칙(예: Bane으로 쓸 $2~3 카드가 없음) |

이것을 그대로 저장하면 크기가 크고, 카드 데이터가 바뀌면 낡은 정보가 남습니다. 그래서 저장할 때는 `saveSetup()`이 카드를 **`id` 문자열로만** 바꾼 `SavedSetup`을 만들고, 불러올 때 `loadSetup()`이 `id`로 카드를 다시 찾아 `GameSetup`을 복원합니다. 데이터에서 사라진 카드가 있으면 그 기록은 건너뜁니다.

### 필터·조건: `Constraints`
[`src/randomizer/constraints.ts`](../src/randomizer/constraints.ts)에 정의돼 있습니다.

| 칸 | 뜻 |
|---|---|
| `exclude` | 절대 쓰지 않을 카드 id 집합 |
| `require` | 반드시 쓸 카드 id 집합. 「다시 뽑기」도 이 카드는 바꾸지 않음 |
| `groupLimits` | 확장 묶음별 왕국 카드 최소·최대 장수. 예: `{ "seaside": { "min": 2, "max": 4 } }` |
| `requireAbilities` | 10장 중 최소 한 장은 가져야 하는 능력 (`village`, `buy`, `draw`, `trash`) |
| `attackNeedsDefense` | 공격 카드가 있으면 방어 카드도 넣기 |
| `costSpread` | $3 이하, $4, $5 이상 구간마다 최소 2장 |

### 저장 위치와 코드 경로
서버가 없으므로 사용자 데이터는 **각자의 브라우저 안에만** 저장됩니다.

| 저장소 | 키 | 저장하는 것 | 코드 위치 |
|---|---|---|---|
| `localStorage` | `dominion-randomizer:v1` | `prefs`: `selected`, `players`, `landscapeChoice`, `sortMode`, `lang`, `constraints` | 읽기·쓰기 [`src/storage.ts`](../src/storage.ts) `loadState`/`saveState`, 저장 시점 `App.vue`의 `watch` |
| `localStorage` | (같은 키) | `history`: `{ at: 시각(밀리초), setup: SavedSetup }` 최대 20개 | 변환 `setup.ts`의 `saveSetup`/`loadSetup`, 추가 `App.vue`의 `remember()` |
| 저장소 파일 | - | 카드 데이터 JSON | `src/data/*.json` (빌드 때 코드에 포함) |

저장되는 값의 모양은 대략 이렇습니다.

```json
{
  "prefs": {
    "selected": ["dominion2ndEdition", "promo:Black Market"],
    "players": 2, "landscapeChoice": "shuffled", "sortMode": "cost", "lang": "ko",
    "constraints": { "exclude": [], "require": [], "groupLimits": {}, "requireAbilities": [], "attackNeedsDefense": false, "costSpread": false }
  },
  "history": [{ "at": 1763600000000, "setup": { "kingdom": ["Moat", "..."], "landscapes": [] } }]
}
```

- `Set`은 JSON으로 저장할 수 없어서 `storage.ts`의 `constraintsToStored`/`constraintsFromStored`가 배열과 서로 바꿉니다.
- 불러올 때 지금 데이터에 없는 확장·카드 id는 버립니다(`App.vue`의 `knownSelection`, `knownCard`). 데이터를 바꿔도 예전 저장값 때문에 앱이 깨지지 않습니다.
- 키 끝의 `v1`은 저장 형식 버전입니다. 형식을 크게 바꾸면 키를 `v2`로 바꿔 예전 값과 섞이지 않게 할 수 있습니다.
- 각자의 기기와 브라우저에만 저장되고 다른 사람과 공유되지 않습니다. 같은 게임을 하는 사람들이 각자 폰으로 열면 서로 다른 결과를 보게 되니, 한 기기의 화면을 기준으로 삼으세요.
- 시크릿 창이나 브라우저 데이터를 지우면 초기화됩니다. 저장 공간을 쓸 수 없는 환경에서도 `try/catch`로 저장만 건너뛰고 정상 동작합니다.

## 5. 뽑기 로직: `src/randomizer/`

「왕국 뽑기」를 누르면 `App.vue`의 `draw()`가 아래 순서로 함수를 부릅니다.

```
draw()                                     App.vue
 ├ kingdomPool(cards, selected)            kingdom.ts      고른 확장의 왕국 카드 모으기 (1·2판 중복 제거)
 ├ drawConstrainedKingdom(...)             constraints.ts  필수 카드 → 확장별 최소 → 나머지 무작위,
 │                                                          능력·방어·비용 조건을 어기면 다시 뽑기
 │   └ 실패하면 "조건에 맞는 왕국을 만들 수 없어요" 오류 표시
 ├ drawLandscapes(...)                     constraints.ts  공식 절차대로 랜드스케이프 (최대 2장, Way는 1장)
 ├ resolveSetup(kingdom, landscapes, ...)  setup.ts        Bane 등 추가 더미, 백금/식민지·대피소 판정,
 │                                                          특성 배치, 오벨리스크, 구성물 체크리스트
 │   └ resolveComponents(...)              components.ts   필요한 구성물 계산 (규칙 27개)
 └ remember(setup)                         App.vue         최근 결과 맨 앞에 저장
```

- 「다시 뽑기」는 `rerollSlot()`(`constraints.ts`)이 한 칸만 바꾸고, 세팅 규칙은 `resolveSetup()`으로 처음부터 다시 계산합니다. 최근 결과에는 새 항목을 더하지 않고 맨 앞 항목을 바꿉니다.
- 「공식 추천 왕국」은 무작위 없이 `setupFromRecommended()`(`setup.ts`)가 규칙서에 적힌 그대로 결과를 만듭니다.
- 인원을 바꾸면 `withPlayers()`가 인원에 따라 달라지는 개수(토큰 수 등)만 다시 계산합니다.
- 각 규칙에는 근거가 된 공식 카드 문구나 규칙서 내용이 주석과 `source` 칸에 적혀 있습니다. 예: 물약 더미 규칙의 `source`는 "Alchemy — Potion 해설: 비용에 물약이 있는 카드가 있으면 물약 더미를 공급처에 추가".
- 무작위 값은 앱에서는 브라우저 기본 함수 `Math.random`을 씁니다. [`src/randomizer/rng.ts`](../src/randomizer/rng.ts)의 `createRng(seed)`는 시드를 넣으면 항상 같은 순서가 나오는 난수 생성기(mulberry32)로, **테스트에서만** 씁니다. 그래서 앱에는 "같은 시드로 같은 결과 재현" 기능이 없습니다.

## 6. Node.js, npm, Vite

### Node.js
JavaScript를 브라우저 밖, 즉 내 컴퓨터에서 실행하게 해 주는 프로그램입니다. 이 프로젝트에서는 **개발 도구를 돌리는 데에만** 씁니다. 사이트를 보는 사람에게는 필요 없습니다. 배포 서버(GitHub Actions)는 Node.js **22**를 씁니다(`deploy.yml`의 `node-version: 22`). 내 컴퓨터도 22 버전대를 쓰는 것이 안전합니다.

### npm
Node.js와 함께 설치되는 **패키지 관리자**입니다. 다른 사람이 만든 도구(패키지)를 내려받고, 정해 둔 명령을 실행합니다.

| 파일/폴더 | 뜻 |
|---|---|
| [`package.json`](../package.json) | 필요한 패키지 목록과 명령(`scripts`) 정의 |
| `package-lock.json` | 실제로 설치된 정확한 버전 기록. 누가 설치해도 같은 버전이 깔리게 함 |
| `node_modules/` | 내려받은 패키지가 들어가는 폴더. 용량이 커서 Git에 올리지 않음 |

`package.json`의 패키지는 두 종류이고, 실제로 쓰이는 곳은 이렇습니다.

| 패키지 | 종류 | 쓰이는 곳 |
|---|---|---|
| `vue` | `dependencies` (사이트에 들어감) | `src/main.ts`, 모든 `.vue` 파일, `src/lang.ts` |
| `vite` | `devDependencies` (개발용) | `npm run dev`/`build`/`preview`, `vite.config.ts` |
| `@vitejs/plugin-vue` | 개발용 | `vite.config.ts`에서 `.vue` 파일 처리 |
| `typescript` | 개발용 | `vue-tsc`가 내부에서 사용 |
| `vue-tsc` | 개발용 | `npm run build`의 첫 단계 타입 검사 |
| `vitest` | 개발용 | `npm test`, `src/randomizer/*.test.ts` |
| `tsx` | 개발용 | `npm run build-data` (`scripts/*.ts` 실행) |
| `@types/node` | 개발용 | `scripts/`에서 쓰는 Node 기능(`node:fs` 등)의 타입 정보 |

### Vite
**빌드 도구**입니다. 두 가지 일을 합니다. 내부에서는 esbuild(0.28.2)와 Rollup(4.68.7)이라는 도구가 변환과 묶기를 맡습니다.

- **개발 서버** (`npm run dev`): 내 컴퓨터에 임시 웹 서버를 띄웁니다. 코드를 저장하면 새로고침 없이 바로 화면에 반영됩니다(HMR).
- **빌드** (`npm run build`): `.ts`, `.vue`, `.json`을 브라우저용 JavaScript, CSS로 바꾸고, 몇 개 파일로 합쳐 크기를 줄인 뒤 `dist/` 폴더에 씁니다. 이 폴더가 실제로 사이트에 올라가는 내용입니다.

설정 파일 [`vite.config.ts`](../vite.config.ts):

```ts
export default defineConfig({
  base: '/dominion-randomizer/',
  plugins: [vue()],
})
```

- `plugins: [vue()]`: Vite가 `.vue` 파일을 읽을 수 있게 합니다.
- `base`: 사이트 주소가 도메인 맨 뒤가 아니라 `/dominion-randomizer/` 아래에 있으므로(12장), 빌드된 파일이 서로를 찾을 때 이 경로를 붙이게 합니다. **저장소 이름을 바꾸면 이 값도 함께 바꿔야** 사이트가 깨지지 않습니다.

### 명령어와 실제 결과

| 명령 | 하는 일 |
|---|---|
| `npm install` | 패키지 설치 (처음 한 번, `package.json`이 바뀌었을 때) |
| `npm run dev` | 개발 서버 실행 → http://localhost:5173/dominion-randomizer/ (Vite 기본 포트) |
| `npm run build` | `vue-tsc --noEmit`(타입 검사) 후 `vite build`로 `dist/` 생성 |
| `npm run preview` | 빌드된 `dist/`를 내 컴퓨터에서 미리 보기 |
| `npm test` | 테스트 한 번 실행 (`vitest run`) |
| `npm run build-data` | 카드 데이터 JSON 다시 만들기 (8장) |

2026-11-20 `npm run build` 결과: 타입 검사 통과, 모듈 43개 변환, 1.31초.

| 생성 파일 | 크기 | gzip 압축 시 |
|---|---|---|
| `dist/index.html` | 0.78 kB | 0.45 kB |
| `dist/assets/index-<해시>.css` | 14.03 kB | 3.04 kB |
| `dist/assets/index-<해시>.js` | 396.08 kB | 85.30 kB |

JS 파일이 큰 이유는 카드 데이터 JSON(약 410KB)이 통째로 들어 있기 때문입니다. 파일 이름의 해시는 내용이 바뀔 때마다 달라져서, 브라우저가 예전 파일을 캐시에서 잘못 쓰는 일을 막아 줍니다.

## 7. 테스트: Vitest

"이렇게 실행하면 이런 결과가 나와야 한다"를 코드로 적어 두고, 명령 한 번으로 전부 확인하는 도구입니다.

```ts
it('contains only Kingdom piles of the selected boxes', () => {
  const pool = kingdomPool(cards, only('dominion2ndEdition'))
  expect(pool).toHaveLength(26)   // 기본판 2판의 왕국 카드는 26종이어야 한다
})
```

| 파일 | 테스트 수 | 확인하는 것 |
|---|---|---|
| `src/randomizer/kingdom.test.ts` | 7 | 뽑을 카드 모으기(1·2판 중복 제거), 10장 뽑기, 비용순 정렬 |
| `src/randomizer/constraints.test.ts` | 8 | 조건을 지키는 뽑기, 랜드스케이프 뽑기, 가나다순 정렬, 한 장 다시 뽑기 |
| `src/randomizer/setup.test.ts` | 19 | 구성물 규칙의 카드 id 확인, 공식 뽑기 절차(`dealKingdom`), Bane 등 세팅 규칙, 랜드스케이프 제한·프로모, 추천 왕국, 저장·복원 |

- 2026-11-20 `npm test` 실행 결과: 테스트 파일 3개, 테스트 **34개 모두 통과**(약 1.8초).
- 테스트는 실제 `cards.json`을 그대로 씁니다. 그래서 카드 데이터를 다시 만들었을 때 데이터가 잘못되면 테스트가 잡아 줍니다.
- 무작위 결과는 `createRng(시드)`로 고정해서 매번 같은 결과로 검사합니다.
- 화면(`.vue`) 테스트는 없습니다. 화면이 실제로 어떻게 보이는지는 개발 서버로 직접 확인해야 합니다.
- 배포 워크플로도 빌드 전에 테스트를 돌리고, **하나라도 실패하면 배포하지 않습니다**(11장).

## 8. 카드 데이터 만들기: `tsx`와 `scripts/`

`src/data/`의 JSON 중 `cards.json`, `sets.json`, `recommended.json`은 사람이 직접 쓰지 않고 `npm run build-data`로 만듭니다. 이 명령은 `tsx`라는 도구로 TypeScript 스크립트를 바로 실행합니다(`tsx`는 빌드 없이 `.ts` 파일을 Node.js에서 실행해 주는 도구입니다).

```
npm run build-data
 ├ tsx scripts/build-data.ts
 │   ├ sumpfork/dominiontabs (MIT)  → 영어 이름, 비용, 종류, 수록 박스, 카드 문구(능력 판별)
 │   ├ 나무위키 「도미니언(보드게임)/카드/<확장>」 → 한국어 이름
 │   ├ src/data/ko-overrides.json   → 손으로 고친 한국어 이름 (가장 우선)
 │   └ 결과: src/data/cards.json, src/data/sets.json
 └ tsx scripts/build-recommended.ts   (cards.json을 읽으므로 반드시 뒤에 실행)
     ├ KingdomCreator (MIT)         → 규칙서의 추천 왕국
     └ 결과: src/data/recommended.json
```

- 출처: [sumpfork/dominiontabs](https://github.com/sumpfork/dominiontabs), [blakevanlan/KingdomCreator](https://github.com/blakevanlan/KingdomCreator).
- 확장 목록(24개 박스와 한국어 이름, 한국어판 여부)은 `scripts/build-data.ts` 안의 `SETS` 배열에 직접 적혀 있습니다.
- 내려받은 원본은 `.cache/` 폴더에 저장해 두고 다음 실행 때 다시 씁니다. 이 폴더는 Git에 올리지 않습니다.
- 이 명령은 인터넷 연결이 필요하고, 데이터를 갱신할 때만 사람이 직접 실행합니다. 배포 워크플로는 실행하지 않고 저장소에 커밋된 JSON을 그대로 씁니다. 그래서 데이터를 고쳤다면 **생성된 JSON 파일도 함께 커밋**해야 사이트에 반영됩니다.
- 이 문서를 쓰면서 `npm run build-data`는 실행하지 않았습니다(외부 사이트에서 내려받기 때문). 위 내용은 스크립트 코드를 읽고 정리한 것입니다.

## 9. Google Fonts

`index.html`이 Google Fonts에서 **고운바탕**(제목용, 굵기 700)과 **Noto Sans KR**(본문용, 400·500·700) 글꼴을 불러옵니다. 글꼴 파일은 저장소에 없고, 접속할 때마다 Google 서버에서 받아 옵니다. 인터넷이 끊겨 있으면 기본 글꼴로 대신 표시됩니다.

## 10. Git과 GitHub

### Git
파일의 변경 이력을 기록하는 프로그램입니다. 내 컴퓨터에서 동작합니다.

| 용어 | 뜻 |
|---|---|
| 저장소(repository) | Git이 이력을 관리하는 폴더. 이 프로젝트 폴더 자체 |
| 커밋(commit) | "이 시점의 파일 상태"를 설명과 함께 기록한 것 |
| 브랜치(branch) | 커밋이 이어지는 줄기. 배포 기준은 `main`이고, 작업은 별도 브랜치에서 한 뒤 `main`에 합칩니다 |
| 푸시(push) | 내 컴퓨터의 커밋을 GitHub로 올리기 |
| PR(Pull Request) | "내 브랜치를 `main`에 합쳐 달라"는 요청. 합치기 전에 변경 내용을 검토 |

### GitHub
Git 저장소를 인터넷에 보관해 주는 서비스입니다. 이 저장소는 **public**이라 누구나 코드와 커밋 기록을 볼 수 있습니다.

커밋 기록에는 작성자 이름과 이메일이 함께 남고, public 저장소에서는 이것도 공개됩니다. 현재 커밋들은 이 저장소 전용 설정 없이 컴퓨터 전체(전역) Git 설정의 이름·이메일로 기록되어 있습니다. 개인 메일을 숨기려면 GitHub가 제공하는 `noreply` 주소(GitHub Settings → Emails에서 확인)를 이 저장소에만 설정하면 됩니다. 이미 올라간 커밋에는 적용되지 않습니다.

```bash
git config user.name "<GitHub 계정명>"
git config user.email "<숫자>+<GitHub 계정명>@users.noreply.github.com"
```

### 수정 후 올리는 방법
```bash
npm test
```
```bash
git add <고친 파일>
```
```bash
git commit -m "변경 내용 설명"
```
```bash
git push
```

`main`에 올라간 순간 자동 배포가 시작됩니다(11장). 푸시 전에 `npm test`와 `npm run build`를 내 컴퓨터에서 먼저 돌려 보면 배포 실패를 미리 막을 수 있습니다. 이 저장소에는 커밋할 때 자동으로 코드를 정리하거나 검사하는 장치(Prettier, ESLint, 커밋 훅)가 없습니다.

## 11. GitHub Actions

GitHub 서버에서 정해진 작업을 자동으로 실행해 주는 기능입니다. "푸시되면 테스트를 돌리고, 통과하면 사이트를 배포해라" 같은 일을 사람 대신 해 줍니다.

| 용어 | 뜻 |
|---|---|
| 워크플로(workflow) | 자동으로 실행할 작업 목록. `.github/workflows/*.yml` 파일로 작성 |
| 트리거(trigger) | 워크플로를 시작시키는 사건. 예: `main`에 푸시 |
| 러너(runner) | 워크플로가 실제로 돌아가는 GitHub의 임시 컴퓨터. 여기서는 `ubuntu-latest`(리눅스) |
| 잡(job) | 워크플로 안의 작업 단위. 각각 새 러너에서 실행됨 |
| 스텝(step) | 잡 안에서 차례로 실행되는 명령 하나 |
| 액션(action) | 남이 만들어 둔 재사용 스텝. `uses: actions/checkout@v4`처럼 씀 |
| 실행(run) | 워크플로가 한 번 돌아간 기록. 저장소의 **Actions** 탭에서 확인 |

### 이 저장소의 워크플로: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
워크플로 파일은 이것 하나입니다. 이름은 **Deploy to GitHub Pages**이고, 다음 때 실행됩니다.

- `main` 브랜치에 푸시될 때 (다른 브랜치에 푸시하면 테스트도 돌지 않습니다)
- Actions 탭에서 「Run workflow」 버튼을 눌렀을 때(`workflow_dispatch`)

두 개의 잡으로 되어 있습니다.

**① `build`**
1. `actions/checkout@v4`: 저장소 코드를 내려받습니다.
2. `actions/setup-node@v4`: Node.js 22를 설치합니다. `cache: npm`으로 패키지를 캐시해 다음 실행을 빠르게 합니다.
3. `npm ci`: `package-lock.json`에 적힌 버전 그대로 패키지를 설치합니다. lock 파일과 `package.json`이 맞지 않으면 실패합니다.
4. `npm test`: 테스트. 실패하면 여기서 멈춥니다.
5. `npm run build`: 타입 검사와 빌드. `dist/`가 생깁니다.
6. `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`: `dist/` 폴더를 Pages 배포용 묶음으로 올립니다.

**② `deploy`** (`build`가 성공해야 시작)
1. `actions/deploy-pages@v4`: 올려 둔 묶음을 실제 사이트에 공개합니다. `environment: github-pages`라서 Actions 화면에 배포된 주소가 표시됩니다.

그 밖의 설정:

- `permissions`: 저장소 코드는 읽기만 하고(`contents: read`), Pages에는 쓸 수 있게(`pages: write`, `id-token: write`) 권한을 최소한으로 줍니다.
- `concurrency`: 짧은 시간에 여러 번 푸시하면, 앞선 배포를 취소하고 마지막 것만 진행합니다.

실패하면 Actions 탭의 실행 기록에 빨간 X가 뜨고, 눌러 보면 어느 스텝에서 실패했는지 나옵니다. 테스트나 타입 검사에서 실패했다면 사이트는 **이전 버전 그대로** 남아 있습니다.

이 문서를 쓰는 시점(2026-11-20)에 확인한 최근 실행 기록은 성공 2회, 그보다 앞선 실패 1회(2026-11-19)입니다. 실패한 실행의 원인은 로그를 볼 권한이 없어 확인하지 못했습니다.

## 12. GitHub Pages 배포

저장소의 파일을 웹 주소로 공개해 주는 GitHub의 무료 기능입니다.

- **정적 파일만 제공합니다.** 서버가 파일을 건네줄 뿐 계산이나 저장은 하지 않습니다. 이 프로젝트는 뽑기를 모두 브라우저에서 하므로 이것으로 충분합니다.
- **무료 계정은 public 저장소에서만 쓸 수 있습니다.** 저장소를 private으로 바꾸면 유료 플랜 없이는 사이트가 내려갑니다.
- **주소 규칙**: `https://<계정명>.github.io/<저장소명>/`. 그래서 6장의 `base` 값이 `/dominion-randomizer/`입니다.

### 공개하는 방식

| 방식 | 공개되는 것 | 이 프로젝트 |
|---|---|---|
| Deploy from a branch | 브랜치에 있는 파일 그대로 | 맞지 않음. 저장소의 `.ts`, `.vue`는 브라우저가 실행할 수 없음 |
| **GitHub Actions** | 워크플로가 빌드해서 올린 결과물(`dist/`) | **이 방식을 사용** |

워크플로 파일 맨 위에도 "Settings → Pages → Source: GitHub Actions"로 한 번 설정하라고 적혀 있습니다. 저장소 설정 화면은 권한이 있어야 볼 수 있어서 직접 확인하지는 못했지만, 배포 워크플로가 성공하고 사이트가 빌드된 파일(`assets/` 아래 JS·CSS)로 열리는 것으로 보아 이렇게 설정되어 있습니다.

화면이 하나라 하위 주소가 없으므로, 하위 주소 새로고침 문제를 막기 위한 `404.html` 복사 같은 처리는 필요 없습니다.

## 13. 로컬에서 확인하기

`index.html`을 더블클릭해서는 열리지 않습니다. TypeScript와 `.vue` 파일을 변환해 줄 Vite가 필요하기 때문입니다.

1. Node.js 22를 설치합니다(https://nodejs.org).
2. 프로젝트 폴더에서 패키지를 설치합니다. 처음 한 번만 하면 됩니다.
   ```bash
   npm install
   ```
3. 개발 서버를 켭니다.
   ```bash
   npm run dev
   ```
4. 터미널에 나온 주소를 브라우저로 엽니다. 코드를 저장하면 바로 반영됩니다. 끝낼 때는 터미널에서 Ctrl+C.

배포될 모습 그대로 보고 싶다면 `npm run build` 후 `npm run preview`를 실행합니다. 빌드 결과는 `/dominion-randomizer/` 경로 기준이라 `dist/index.html`을 더블클릭해서는 열리지 않습니다.

## 14. 전체 흐름 요약

```
[데이터 갱신 — 가끔, 사람이 직접]
npm run build-data
  → dominiontabs · 나무위키 · KingdomCreator에서 내려받기 (+ ko-overrides.json)
  → src/data/cards.json, sets.json, recommended.json 생성 → 커밋

[개발]
코드 수정 (App.vue · components/*.vue 화면, randomizer/*.ts 규칙, data/ 데이터)
  │
  ├─ npm run dev     → 내 PC에서 미리보기 (localhost:5173)
  ├─ npm test        → 규칙 로직 검사 (34개)
  └─ npm run build   → 타입 검사 + dist/ 생성 확인

[검사와 배포]
git push (main)
  → GitHub Actions: npm ci → npm test → npm run build → dist/ 업로드 → GitHub Pages 배포

[사용자 브라우저]
index.html + JS(카드 데이터 포함) + CSS 다운로드, Google Fonts 글꼴
  → Vue가 화면 그림
  → 왕국 뽑기: kingdomPool → drawConstrainedKingdom → drawLandscapes → resolveSetup
  → 설정·최근 결과: localStorage (dominion-randomizer:v1)
```

## 15. 작업 종류별로 봐야 할 곳

| 하고 싶은 일 | 볼 곳 | 필요한 지식 |
|---|---|---|
| 카드 한국어 이름 고치기 | `src/data/ko-overrides.json`에 추가 → `npm run build-data` → JSON 커밋 | JSON 문법 |
| 확장 한국어 이름·한국어판 여부 고치기 | `scripts/build-data.ts`의 `SETS` → `npm run build-data` | TypeScript 객체 문법 기초 |
| 새 확장·카드 반영 | `npm run build-data` (출처에 반영된 뒤), 필요하면 `SETS`에 박스 추가 | 위와 같음 |
| 화면 문구 바꾸기 | 해당 `.vue` 파일의 `<template>` (문구가 코드에 한국어로 직접 적혀 있음) | HTML 기초 |
| 랜드스케이프 방식 문구·종류 | `App.vue`의 `LANDSCAPE_RULES` | TypeScript 기초 |
| 색·모양 바꾸기 | 공통 색은 `src/style.css`의 `:root`, 부품별 모양은 각 `.vue`의 `<style scoped>` | CSS |
| 새 필터·조건 추가 | `constraints.ts`의 `Constraints`와 `violations()`, 화면은 `FiltersPanel.vue`, 저장은 `storage.ts` | TypeScript, Vue |
| 세팅 규칙(Bane 등) 고치기 | `setup.ts`의 `resolveSetup()` | TypeScript |
| 추가 구성물·카드 세팅 안내 고치기 | `components.ts`의 `COMPONENT_RULES`, `SETUP_NOTES` | TypeScript |
| 카드 한 장 모양 | `components/CardTile.vue` | Vue, CSS |
| 저장 항목 추가 | `storage.ts`의 `StoredPrefs`, `App.vue`의 `watch`와 초기값 복원 부분 | TypeScript, Vue |
| 배포 과정 바꾸기 | `.github/workflows/deploy.yml` | GitHub Actions |

규칙 코드(`randomizer/`)를 고쳤다면 같은 폴더의 `*.test.ts`에 테스트를 추가하고 `npm test`로 확인하세요.

## 16. 공부 순서 추천

1. **HTML, CSS 기초**: 태그와 CSS 선택자. `.vue`의 `<template>`과 `<style>`이 이것입니다. (https://developer.mozilla.org/ko/docs/Learn)
2. **TypeScript 기초**: 타입 표기 읽는 법, `interface`. `src/data/types.ts`를 읽어 보면 연습이 됩니다. (https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
3. **Vue 기초**: `ref`, `computed`, `v-if`, `v-for`, props, emit. `CardTile.vue` → `App.vue` 순서로 읽으면 좋습니다. (https://ko.vuejs.org/guide/introduction.html)
4. **규칙 코드 읽기**: `kingdom.ts` → `constraints.ts` → `setup.ts`. 각 테스트 파일을 함께 보면 함수가 무엇을 해야 하는지 알 수 있습니다.
5. 나머지(Vite 설정, Vitest, GitHub Actions)는 해당 부분을 고칠 때 필요한 만큼만 보면 됩니다.
