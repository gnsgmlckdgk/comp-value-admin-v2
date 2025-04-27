# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

<br><br><br>

# 사용 라이브러리 정리

## React Data Table Component (RDT)
가벼운 Grid 라이브러리

### 📋 React Data Table Component 주요 옵션 정리

| 옵션 | 설명 | 예시 |
|:-----|:-----|:-----|
| `columns` | 테이블 컬럼 설정 | `[ { name: '이름', selector: row => row.name } ]` |
| `data` | 표시할 데이터 배열 | `[ { name: '홍길동', age: 30 } ]` |
| `pagination` | 페이지네이션 활성화 | `pagination` |
| `highlightOnHover` | 행에 마우스 올리면 강조 | `highlightOnHover` |
| `pointerOnHover` | 행에 마우스 올리면 커서 포인터 변경 | `pointerOnHover` |
| `selectableRows` | 행 체크박스 선택 기능 추가 | `selectableRows` |
| `onRowClicked` | 행 클릭 이벤트 핸들러 | `onRowClicked={row => console.log(row)}` |
| `defaultSortFieldId` | 기본 정렬할 컬럼 지정 | `defaultSortFieldId={1}` |
| `fixedHeader` | 헤더를 고정하고 스크롤 가능 | `fixedHeader` |
| `responsive` | 반응형 지원 (기본 적용) | `responsive` |
| `progressPending` | 로딩 중 스피너 표시 | `progressPending={true}` |
| `theme` | 테이블 테마 지정 | `theme="solarized"` |

### 📌 추가 팁

- `sortable: true`를 컬럼 설정에 추가하면, 해당 컬럼만 정렬 가능하게 만들 수 있습니다.
- `width`, `grow`, `center` 옵션으로 컬럼 너비 및 정렬을 세밀하게 조정할 수 있습니다.
- `createTheme`를 사용하면 커스텀 테마를 직접 만들 수 있습니다.

> 더 자세한 내용은 [React Data Table Component 공식 문서](https://react-data-table-component.netlify.app/)를 참고하세요.

<br>

## tailwindcss  
CSS 제공  
https://tailwindcss.com/docs/preflight

### 참고
#### 반응형
| 이름 | 화면 너비 기준 | 의미 |
|:-----|:---------------|:-----|
| `sm:` | 640px 이상 | 작은 태블릿 이상 |
| `md:` | 768px 이상 | 일반 태블릿, 작은 노트북 이상 |
| `lg:` | 1024px 이상 | 노트북 이상 |
| `xl:` | 1280px 이상 | 큰 데스크탑 이상 |
| `2xl:` | 1536px 이상 | 초대형 화면 |

## animatecss  
다양한 애니메이션 제공  
https://animate.style/