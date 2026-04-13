# CompValue Frontend 프로젝트 규칙

## 기술 스택
- React 19 + Vite 6.3 + React Router 6.30
- Tailwind CSS v4, Recharts 2.15, AG Grid 33.2
- Lexical 0.20 (리치 텍스트), Axios 1.9, XLSX/ExcelJS

## 디렉토리 구조
```
/src
├── component/common/    # Button, Input, Select, Loading, PageTitle, ToggleSection
├── component/feature/   # board, home 등 기능별
├── component/grid/      # AG Grid 관련
├── component/layouts/   # Header, SideBar, Modal
├── config/              # routes.jsx, PrivateRoutes
├── context/             # AuthContext, ThemeContext
├── hooks/               # useRole, useTransactions
├── pages/               # Home, Member, Trade, Transaction 등
└── util/                # ClientUtil, DateUtil, RoleUtil
```

## 핵심 패턴

### API 호출
```javascript
import { send } from '@/util/ClientUtil';
const { data, error } = await send(url, params, method);
```

### 인증
```javascript
const { isLoggedIn, userName, nickName, roles } = useAuth();
const { sessionTTL } = useSession(); // SessionContext에서 별도 관리
```

### 다크모드 (필수)
모든 컴포넌트에 `dark:` variant 포함:
```jsx
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
```

### 모달 패턴
```javascript
const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });
```

## 네이밍 규칙
- 컴포넌트: PascalCase (`LoginModal.jsx`)
- 유틸: `기능Util` (`ClientUtil.jsx`)
- 훅: `use기능` (`useRole.js`)
- Context: `기능Context` (`AuthContext.jsx`)
- Import 별칭: `@/` 사용 (`import X from '@/util/ClientUtil'`)

## 스타일링
- Tailwind CSS v4, 다크모드 variant 항상 포함
- 컬러: sky-500/indigo-500 (primary), slate 계열 (bg/text/border)
- 반응형: sm(640) / md(768) / lg(1024) / xl(1280)
- 폰트: BinggraeMelona.otf (14px)

## 접근성
- **적록색약** — 빨강/초록 색상 구분 어려움. UI에서 빨강↔초록 대비 대신 **파랑↔노랑↔주황** 등 색각이상 친화 팔레트 사용할 것

## 코드 스타일
- React: 함수형 컴포넌트, 커스텀 훅, Tailwind CSS
- **동작은 동일, 코드는 짧고 읽기 쉽게, 주석은 동일**

## 개발
- `npm run dev` (개발), `npm run build` (빌드)
- 프록시: `/dart/` → `http://localhost:18080`
