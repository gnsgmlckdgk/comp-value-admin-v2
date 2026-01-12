# CompValue 프로젝트 개발 스킬

이 스킬은 CompValue 프로젝트(기업가치 분석 및 포트폴리오 관리 플랫폼)에 대한 전문적인 지원을 제공합니다.

## 프로젝트 개요

CompValue는 **React 19 기반 웹 애플리케이션**으로, 국내외 기업의 주당 가치를 계산하고 표시합니다. 사용자가 주식 가치를 분석하고, 거래 기록을 관리하며, 투자 포트폴리오를 평가할 수 있도록 돕습니다.

## 핵심 기술 스택

- **프론트엔드**: React 19.0 + Vite 6.3 + React Router 6.30
- **스타일링**: Tailwind CSS v4 (Utility-first 방식)
- **HTTP 클라이언트**: Axios 1.9
- **데이터 시각화**: Recharts 2.15, AG Grid 33.2
- **리치 텍스트 편집**: Lexical 0.20
- **문서 처리**: XLSX 0.18, ExcelJS 4.4

## 아키텍처 패턴

### 디렉토리 구조
```
/src
  /component - 모든 React 컴포넌트
    /common - 재사용 가능한 UI 컴포넌트 (Button, Input, Select 등)
    /feature - 기능별 특화 컴포넌트 (board, home)
    /grid - 그리드 관련 컴포넌트
    /layouts - 레이아웃 컴포넌트 (Header, SideBar, Modals)
  /config - 설정 파일 (routes, PrivateRoutes)
  /context - 전역 상태 관리 (AuthContext, ThemeContext)
  /hooks - 커스텀 React 훅 (useRole)
  /pages - 페이지 레벨 컴포넌트 (Home, Member, Trade, Transaction)
  /util - 유틸리티 함수 (ClientUtil, DateUtil, RoleUtil)
```

### 명명 규칙
- **컴포넌트**: PascalCase (예: `LoginModal.jsx`)
- **유틸리티**: 기능명 + Util (예: `ClientUtil.jsx`, `DateUtil.jsx`)
- **훅**: use + 기능명 (예: `useRole.js`, `useTransactions.js`)
- **컨텍스트**: 기능명 + Context (예: `AuthContext.jsx`)

### Import 별칭
깔끔한 import를 위해 `@/` 별칭 사용:
```javascript
import { send } from '@/util/ClientUtil';
import Button from '@/component/common/button/Button';
```

## 상태 관리

### AuthContext
인증 및 세션 관리 제공:
```javascript
const {
  isLoggedIn,      // boolean - 로그인 여부
  userName,        // string - 사용자명
  nickName,        // string - 닉네임
  roles,           // string[] - 권한 배열
  sessionTTL,      // number - 세션 남은 시간(초)
  startSessionTimer,   // 타이머 시작
  resetSessionTimer,   // 타이머 리셋
  syncSessionTTL       // 서버 TTL 동기화
} = useAuth();
```

### ThemeContext
다크모드 관리:
```javascript
const { isDark, toggleTheme } = useTheme();
```

## API 통신

### ClientUtil 패턴
모든 API 호출에 `send()` 함수 사용:
```javascript
import { send } from '@/util/ClientUtil';

const { data, error } = await send(url, params, method);

if (error) {
  // 에러 처리
} else {
  // data.response 사용
}
```

### API 엔드포인트 패턴
기본 경로: `/dart/`

주요 엔드포인트:
- `/dart/member/me/info` - 사용자 정보 및 세션 TTL 조회
- `/dart/member/login` - 로그인
- `/dart/member/logout` - 로그아웃
- `/dart/main/cal/per_value` - 국내 기업가치 계산
- `/dart/main/cal/per_value/abroad` - 해외 기업가치 계산
- `/dart/tranrecord` - 거래 기록 CRUD
- `/dart/sellrecord/regi` - 매도 기록 등록
- `/dart/freeboard` - 게시판 CRUD

### 세션 관리
- 초기 TTL: 1800초 (30분)
- API 호출 성공 시 자동 리셋
- 5분마다 주기적 동기화
- 401 응답 시 강제 로그아웃

## 컴포넌트 개발 가이드라인

### 표준 컴포넌트 구조
```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { send } from '@/util/ClientUtil';
import Button from '@/component/common/button/Button';

export default function MyComponent() {
  const [state, setState] = useState(initialValue);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    // 초기화 로직
  }, []);

  const handleAction = async () => {
    const { data, error } = await send(url, params, 'GET');
    if (error) {
      // 에러 처리
    } else {
      // 데이터 처리
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800">
      {/* JSX */}
    </div>
  );
}
```

### 사용 가능한 공통 컴포넌트
- `Button` - 다양한 버튼 스타일 (primary, danger, outline, select)
- `Input` - 텍스트 입력 필드
- `TextArea` - 긴 텍스트 입력
- `Select001` - 드롭다운 선택
- `InfoTable` - 정보 표시 테이블
- `SimpleList` - 리스트 표시
- `Loading` - 로딩 스피너
- `PageTitle` - 페이지 제목 컴포넌트
- `ToggleSection` - 확장/축소 섹션
- `RichTextEditor` - Lexical 기반 에디터

### 모달 패턴
```javascript
const [alertConfig, setAlertConfig] = useState({
  open: false,
  message: '',
  onConfirm: null
});

const openAlert = (message, onConfirm) => {
  setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
};

const handleCloseAlert = () => {
  const { onConfirm } = alertConfig;
  setAlertConfig({ open: false, message: '', onConfirm: null });
  if (onConfirm) onConfirm();
};
```

## Tailwind CSS 스타일링

### 다크모드 지원
항상 다크모드 variant 포함:
```jsx
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
  콘텐츠
</div>
```

### 반응형 브레이크포인트
```
sm:  640px   (작은 태블릿)
md:  768px   (태블릿)
lg:  1024px  (노트북)
xl:  1280px  (데스크톱)
2xl: 1536px  (대형 데스크톱)
```

### 공통 컬러 팔레트
- **Primary**: sky-500, indigo-500
- **Background**: white / slate-800 (다크)
- **Text**: slate-900 / white (다크)
- **Border**: slate-200 / slate-700 (다크)

## 라우팅

### 라우트 정의
라우트는 `/src/config/routes.jsx`에 객체로 정의:
```javascript
const routes = {
  "Home": { path: '/', element: <Home /> },
  "CompValue": { path: '/compvalue', element: <CompValue /> },
  // ... 추가 라우트
}
```

### 공개 라우트
인증이 필요 없는 라우트:
- `/` (홈)
- `/member/join` (회원가입)

### 네비게이션
React Router 훅 사용:
```javascript
import { useNavigate, useLocation } from 'react-router-dom';

const navigate = useNavigate();
navigate('/path', { replace: true, state: { data } });
```

## 권한 기반 접근 제어

### 사용 가능한 권한
```javascript
ROLES = {
  SUPER_ADMIN: 'ROLE_SUPER_ADMIN',
  ADMIN: 'ROLE_ADMIN',
  USER: 'ROLE_USER',
}
```

### useRole 훅
```javascript
import { useRole } from '@/hooks/useRole';

const { roles, hasRole, hasAnyRole, isAdmin, isUser } = useRole();

if (hasRole(ROLES.ADMIN)) {
  // 관리자 전용 로직
}
```

## 이벤트 통신

### 커스텀 이벤트
```javascript
// 발신
window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: '401' } }));

// 수신
window.addEventListener('auth:logout', (e) => {
  const reason = e.detail.reason;
});
```

### 표준 이벤트
- `auth:login:open` - 로그인 모달 열기
- `auth:logout` - 사용자 로그아웃
- `session:activity` - 세션 활동 감지

## 유틸리티 함수

### DateUtil
```javascript
import { formatTimestamp, getToday } from '@/util/DateUtil';

formatTimestamp(timestamp); // "2024-01-07 14:30:45"
getToday('yyyyMMdd');        // "20240107"
```

### RoleUtil
```javascript
import { hasRole, hasAnyRole, hasAllRoles } from '@/util/RoleUtil';

hasRole(userRoles, 'ROLE_ADMIN');
hasAnyRole(userRoles, ['ROLE_ADMIN', 'ROLE_MANAGER']);
```

## 개발 명령어

```bash
npm run dev      # 개발 서버 시작
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
npm run preview  # 프로덕션 빌드 미리보기
```

## 기억해야 할 핵심 기능

1. **세션 타이머**: 헤더에 세션 TTL 표시 (MM:SS 형식)
2. **다크모드**: 항상 다크 테마 variant 지원
3. **반응형 디자인**: Tailwind 브레이크포인트 사용 (sm, md, lg)
4. **권한 기반 UI**: 사용자 권한에 따라 기능 표시/숨김
5. **API 에러 처리**: 401 발생 시 자동 로그아웃
6. **localStorage 동기화**: 인증 상태가 새로고침 후에도 유지됨
7. **경로 별칭**: 모든 import에 `@/` 사용

## 일반 작업

### 새 페이지 추가
1. `/src/pages/`에 컴포넌트 생성
2. `/src/config/routes.jsx`에 라우트 추가
3. 필요시 사이드바에 메뉴 항목 추가
4. 다크모드 지원하여 구현

### API 호출 추가
1. `@/util/ClientUtil`의 `send()` 사용
2. 성공 및 에러 케이스 모두 처리
3. 성공 시 세션 자동 리셋됨

### 모달 생성
1. state config로 모달 패턴 사용
2. `AlertModal` import 또는 커스텀 모달 생성
3. confirm/cancel 콜백 처리

### 사용자 상태 관리
1. 인증 관련 상태는 `useAuth()` 사용
2. 보호된 액션 전에 `isLoggedIn` 확인
3. 권한 체크에 `roles` 사용

## Best Practices

1. **컴포넌트 구성**: 컴포넌트를 작고 집중적으로 유지
2. **상태 관리**: 전역 상태는 Context, UI 상태는 로컬 state 사용
3. **에러 처리**: API 에러를 우아하게 처리
4. **로딩 상태**: 비동기 작업 중 로딩 인디케이터 표시
5. **접근성**: 시맨틱 HTML과 ARIA 레이블 사용
6. **성능**: 적절한 의존성으로 불필요한 리렌더링 방지
7. **코드 재사용성**: 공통 로직을 훅/유틸로 추출

## 페이지 구조 예시

### 간단한 페이지
```javascript
export default function SimplePage() {
  const { isLoggedIn } = useAuth();
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await send('/dart/endpoint', {}, 'GET');
    if (!error) setData(data.response);
  };

  return (
    <div className="p-6">
      <PageTitle title="페이지 제목" />
      {/* 콘텐츠 */}
    </div>
  );
}
```

### 복잡한 페이지 (CRUD 포함)
`/src/pages/transaction/TransactionOverview.jsx` 참고 - 다음을 포함하는 종합 예시:
- 여러 모달
- 인라인 편집이 가능한 테이블
- 그룹화 및 정렬
- 환율 변환
- 알림 처리

## 중요 사항

- **세션 TTL**: 모바일을 포함한 모든 화면 크기에서 표시됨
- **프록시 설정**: 개발 프록시가 `/dart/`를 `http://localhost:18080`으로 전달
- **Git 브랜치**: `feature-ai` 브랜치에서 작업 중
- **빌드 도구**: React 플러그인 및 HMR이 포함된 Vite
- **커스텀 폰트**: BinggraeMelona.otf (기본 크기 14px)

---

이 프로젝트에서 작업할 때:
1. 항상 기존 패턴과 컨벤션을 따를 것
2. 모든 새 컴포넌트에서 다크모드 지원 유지
3. 가능한 한 제공된 공통 컴포넌트 사용
4. 재사용성을 위해 API 호출을 별도 함수로 분리
5. 데스크톱과 모바일 반응형 레이아웃 모두 테스트
6. 권한 기반 접근 제어가 올바르게 작동하는지 확인
7. 세션 관리가 제대로 작동하는지 확인
