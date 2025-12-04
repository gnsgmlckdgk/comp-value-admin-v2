# 권한 관리 시스템 사용 가이드

## 개요
로그인 시 백엔드에서 받은 `roles` 배열을 저장하고, 권한 기반으로 메뉴와 컴포넌트를 제어할 수 있습니다.

## 저장되는 데이터
로그인 성공 시 다음 정보들이 저장됩니다:
- **AuthContext**: `roles` 배열 (전역 상태)
- **localStorage**: `roles` JSON 문자열

## 사용 방법

### 1. 컴포넌트에서 권한 체크 (useRole 훅)

```jsx
import { useRole } from '@/hooks/useRole';

function MyComponent() {
    const { roles, hasRole, hasAnyRole, isAdmin } = useRole();

    // 단일 권한 체크
    if (hasRole('ROLE_ADMIN')) {
        return <AdminButton />;
    }

    // 여러 권한 중 하나라도 있는지 체크
    if (hasAnyRole(['ROLE_ADMIN', 'ROLE_MANAGER'])) {
        return <ManagementPanel />;
    }

    // 편의 속성 사용
    if (isAdmin) {
        return <SuperAdminFeature />;
    }

    return <NormalUserView />;
}
```

### 2. 컴포넌트 조건부 렌더링 (RoleGuard)

```jsx
import RoleGuard from '@/component/common/auth/RoleGuard';

function Dashboard() {
    return (
        <div>
            {/* 관리자만 볼 수 있는 메뉴 */}
            <RoleGuard requiredRoles={['ROLE_ADMIN']}>
                <AdminMenu />
            </RoleGuard>

            {/* 관리자 또는 매니저만 볼 수 있는 메뉴 */}
            <RoleGuard requiredRoles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
                <ManagementMenu />
            </RoleGuard>

            {/* 여러 권한을 모두 가져야 보이는 메뉴 */}
            <RoleGuard requiredRoles={['ROLE_ADMIN', 'ROLE_SUPER']} requireAll>
                <SuperAdminPanel />
            </RoleGuard>

            {/* 권한 없을 때 fallback 표시 */}
            <RoleGuard
                requiredRoles={['ROLE_PREMIUM']}
                fallback={<div>프리미엄 회원 전용 기능입니다.</div>}
            >
                <PremiumFeature />
            </RoleGuard>

            {/* 모든 사용자에게 표시 */}
            <NormalMenu />
        </div>
    );
}
```

### 3. 페이지 레벨 권한 보호 (ProtectedRoute)

```jsx
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/component/common/auth/ProtectedRoute';

function AppRoutes() {
    return (
        <Routes>
            {/* 누구나 접근 가능 */}
            <Route path="/" element={<Home />} />

            {/* 로그인한 사용자만 접근 가능 */}
            <Route
                path="/mypage"
                element={
                    <ProtectedRoute>
                        <MyPage />
                    </ProtectedRoute>
                }
            />

            {/* 관리자만 접근 가능 */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute requiredRoles={['ROLE_ADMIN']}>
                        <AdminPage />
                    </ProtectedRoute>
                }
            />

            {/* 관리자 또는 매니저만 접근 가능 */}
            <Route
                path="/management"
                element={
                    <ProtectedRoute requiredRoles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
                        <ManagementPage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
```

### 4. 메뉴 배열 필터링 (filterMenuByRole)

```jsx
import { useAuth } from '@/context/AuthContext';
import { filterMenuByRole } from '@/util/RoleUtil';

function Sidebar() {
    const { roles } = useAuth();

    const allMenuItems = [
        {
            name: '홈',
            path: '/',
            // requiredRoles가 없으면 모두에게 표시
        },
        {
            name: '관리자 페이지',
            path: '/admin',
            requiredRoles: ['ROLE_ADMIN'],
        },
        {
            name: '매니저 페이지',
            path: '/management',
            requiredRoles: ['ROLE_ADMIN', 'ROLE_MANAGER'],
        },
        {
            name: '사용자 페이지',
            path: '/mypage',
            requiredRoles: ['ROLE_USER'],
        },
    ];

    // 권한에 맞는 메뉴만 필터링
    const visibleMenus = filterMenuByRole(allMenuItems, roles);

    return (
        <nav>
            {visibleMenus.map(menu => (
                <a key={menu.path} href={menu.path}>
                    {menu.name}
                </a>
            ))}
        </nav>
    );
}
```

### 5. 직접 유틸 함수 사용

```jsx
import { hasRole, hasAnyRole, hasAllRoles, getRolesFromStorage } from '@/util/RoleUtil';

// localStorage에서 roles 가져오기
const userRoles = getRolesFromStorage(); // ['ROLE_USER', 'ROLE_ADMIN']

// 단일 권한 체크
if (hasRole(userRoles, 'ROLE_ADMIN')) {
    console.log('관리자입니다');
}

// 여러 권한 중 하나라도 있는지 체크
if (hasAnyRole(userRoles, ['ROLE_ADMIN', 'ROLE_MANAGER'])) {
    console.log('관리자 또는 매니저입니다');
}

// 모든 권한을 가지고 있는지 체크
if (hasAllRoles(userRoles, ['ROLE_USER', 'ROLE_ADMIN'])) {
    console.log('일반 사용자이면서 관리자입니다');
}
```

## 권한 상수 정의

`src/util/RoleUtil.jsx`에 권한 상수가 정의되어 있습니다:

```jsx
import { ROLES } from '@/util/RoleUtil';

// 사용 예시
<RoleGuard requiredRoles={[ROLES.ADMIN]}>
    <AdminPanel />
</RoleGuard>
```

필요한 권한을 `ROLES` 객체에 추가하여 사용하세요:

```jsx
export const ROLES = {
    ADMIN: 'ROLE_ADMIN',
    USER: 'ROLE_USER',
    MANAGER: 'ROLE_MANAGER',
    PREMIUM: 'ROLE_PREMIUM',  // 추가 예시
    // 필요한 권한을 여기에 추가
};
```

## 주의사항

1. **백엔드 응답 형식**: 백엔드에서 `roles` 배열로 반환해야 합니다.
   ```json
   {
       "username": "user123",
       "nickName": "홍길동",
       "roles": ["ROLE_USER", "ROLE_ADMIN"]
   }
   ```

2. **권한 네이밍**: 권한 이름을 백엔드와 일치시켜야 합니다.

3. **로그아웃 시 정리**: 로그아웃 시 roles 정보가 자동으로 초기화됩니다.

4. **보안**: 프론트엔드 권한 체크는 UI 제어용입니다. 중요한 로직은 반드시 백엔드에서 권한 체크를 수행해야 합니다.

## 파일 구조

```
src/
├── context/
│   └── AuthContext.jsx         # roles 상태 관리
├── util/
│   └── RoleUtil.jsx           # 권한 체크 유틸 함수
├── hooks/
│   └── useRole.js             # 권한 체크 커스텀 훅
└── component/
    └── common/
        └── auth/
            ├── RoleGuard.jsx      # 컴포넌트 레벨 권한 가드
            └── ProtectedRoute.jsx # 라우트 레벨 권한 가드
```

## 실전 예제: 메뉴 시스템 통합

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { filterMenuByRole } from '@/util/RoleUtil';
import RoleGuard from '@/component/common/auth/RoleGuard';

function Navigation() {
    const { roles } = useAuth();

    const menuItems = [
        { name: '홈', path: '/', icon: '🏠' },
        { name: '내 정보', path: '/mypage', icon: '👤', requiredRoles: ['ROLE_USER'] },
        { name: '포트폴리오', path: '/portfolio', icon: '💼', requiredRoles: ['ROLE_USER'] },
        { name: '관리자', path: '/admin', icon: '⚙️', requiredRoles: ['ROLE_ADMIN'] },
        { name: '통계', path: '/stats', icon: '📊', requiredRoles: ['ROLE_ADMIN', 'ROLE_MANAGER'] },
    ];

    // 권한에 맞는 메뉴만 표시
    const visibleMenus = filterMenuByRole(menuItems, roles);

    return (
        <nav>
            {visibleMenus.map(menu => (
                <Link key={menu.path} to={menu.path}>
                    <span>{menu.icon}</span>
                    <span>{menu.name}</span>
                </Link>
            ))}

            {/* 추가 기능: 관리자만 보이는 버튼 */}
            <RoleGuard requiredRoles={['ROLE_ADMIN']}>
                <button onClick={() => console.log('관리자 전용 기능')}>
                    설정
                </button>
            </RoleGuard>
        </nav>
    );
}
```
