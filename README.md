# 학교회계 예산현황판

현재 표시 버전: **v0.6.0**

에듀파인 엑셀 자료를 **브라우저에서 직접 분석**해 사업별 예산 잔액, 학교 전체 집행현황, 업무추진비, 집행계획, 결산예측을 확인하는 웹 앱입니다.

## 주요 기능

- 사업관리카드(현액) 기반 `내 사업` 예산 분석
- 전체 이름·세부사업·세부항목 가나다/역순, 사용 가능액 많은/적은 순 정렬과 잔액·계획 상태 필터
- 데스크톱 예산·집행계획 목록을 한 줄형으로 압축해 빠르게 비교
- 102-2 파일 드래그앤드롭 및 학교 전체 집행현황 분석
- 학교 전체 예산을 지급 완료·지급 대기·미원인행위로 나눈 예산 흐름 시각화
- 정책사업 → 단위사업 → 세부사업 → 세부항목 계층형 분석과 검색·정렬
- 지급 대기 금액·미원인행위 잔액이 큰 사업 빠른 확인
- 업무추진비 잔액 및 산출내역별 집행예정액 관리
- 201 세입자료를 연결한 순세계잉여금 결산예측
- 금액을 `1억 1,000만원`처럼 읽기 쉬운 단위로 표시
- 입력한 집행예정액은 현재 브라우저의 로컬 저장소에 보관

## 에듀파인 파일 경로

### 사업관리카드(현액)

`에듀파인 > 학교회계 > 사업관리 > 사업관리카드 > 사업관리카드(현액)`

### 102-2 · 201 집행실적

`에듀파인 > 학교회계 > 예산결산 > 결산현황 > 집행실적 엑셀저장(실시간)`

## 프로젝트 구조

이 저장소는 **일반 Next.js 프로젝트**입니다. ChatGPT Sites / Vinext / Cloudflare Worker 전용 파일은 제거했습니다.

```text
school-expense-dashboard/
├─ app/
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ public/
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
└─ tsconfig.json
```

## 로컬 실행

### 준비물

- Node.js 22 이상
- npm

### 실행

```bash
npm install
npm run dev
```

브라우저에서 터미널에 표시된 로컬 주소를 열면 됩니다.

프로덕션 빌드 확인:

```bash
npm run build
npm run start
```

## GitHub에 올리기

GitHub에서 빈 저장소를 만든 뒤, 이 폴더 안의 파일을 저장소 루트에 올립니다.

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

> 저장소 안에 `school-expense-dashboard` 폴더를 한 번 더 중첩해서 올리지 말고, `package.json`이 저장소 최상위에 오도록 올리는 것을 권장합니다.

## Vercel 배포

이 프로젝트는 별도 서버 설정 없이 Vercel에서 일반 Next.js 프로젝트로 배포할 수 있습니다.

1. Vercel에서 **Add New > Project**
2. GitHub의 이 저장소 선택
3. Framework Preset이 `Next.js`인지 확인
4. Root Directory는 저장소 최상위라면 그대로 둠
5. 별도 환경변수 없이 **Deploy**

이후 GitHub `main` 브랜치에 변경사항을 push하면 Vercel이 자동으로 다시 배포합니다.

## 개인정보와 파일 처리

현재 예산 엑셀 분석은 브라우저에서 처리합니다. 사용자가 입력한 집행예정액도 브라우저 `localStorage`에 보관되며, 별도 데이터베이스로 저장하지 않습니다.

공용 PC에서는 사용 후 브라우저에 남은 로컬 데이터를 삭제하는 것을 권장합니다.
