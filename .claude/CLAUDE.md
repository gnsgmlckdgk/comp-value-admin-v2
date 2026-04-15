# CompValue Frontend 프로젝트 규칙

## 기술 스택
- React 19 + Vite 6.3 + React Router 6.30
- Tailwind CSS v4, Recharts 2.15
- Lexical 0.20 (리치 텍스트), Axios 1.9, XLSX/ExcelJS

## 디렉토리 구조
```
/src
├── component/common/    # Button, Input, Select, Loading, PageTitle, ToggleSection
├── component/feature/   # board, home 등 기능별
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

## 코드 스타일
- React: 함수형 컴포넌트, 커스텀 훅, Tailwind CSS
- **동작은 동일, 코드는 짧고 읽기 쉽게, 주석은 동일**

## 개발
- `npm run dev` (개발), `npm run build` (빌드)
- 프록시: `/dart/` → `http://localhost:18080`

## 디자인 시스템
- UI 작업 시 반드시 `docs/DESIGN_SYSTEM.md`를 먼저 읽고 따를 것
- 새 컴포넌트 추가 시 디자인 시스템의 색상/폰트/애니메이션 규칙 준수
