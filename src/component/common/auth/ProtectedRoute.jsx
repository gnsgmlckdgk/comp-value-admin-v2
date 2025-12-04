import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { hasAnyRole } from '@/util/RoleUtil';

/**
 * 권한 기반 라우트 보호 컴포넌트
 * React Router와 함께 사용하여 페이지 레벨에서 권한 체크
 *
 * @example
 * <Route
 *   path="/admin"
 *   element={
 *     <ProtectedRoute requiredRoles={['ROLE_ADMIN']}>
 *       <AdminPage />
 *     </ProtectedRoute>
 *   }
 * />
 */
export default function ProtectedRoute({
    children,
    requiredRoles = [],
    redirectTo = '/',
}) {
    const { isLoggedIn, roles } = useAuth();

    // 로그인하지 않은 경우
    if (!isLoggedIn) {
        return <Navigate to={redirectTo} replace />;
    }

    // 필요한 권한이 없는 경우
    if (requiredRoles.length > 0 && !hasAnyRole(roles, requiredRoles)) {
        return <Navigate to={redirectTo} replace />;
    }

    // 권한이 있으면 페이지 렌더링
    return children;
}
