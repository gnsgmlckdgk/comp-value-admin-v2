import { useAuth } from '@/context/AuthContext';
import { hasAnyRole, hasAllRoles } from '@/util/RoleUtil';

/**
 * 권한 기반 컴포넌트 가드
 * 필요한 권한이 없으면 children을 렌더링하지 않거나 fallback을 표시
 *
 * @example
 * // 하나라도 있으면 표시
 * <RoleGuard requiredRoles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
 *   <AdminMenu />
 * </RoleGuard>
 *
 * @example
 * // 모두 있어야 표시
 * <RoleGuard requiredRoles={['ROLE_ADMIN', 'ROLE_SUPER']} requireAll>
 *   <SuperAdminPanel />
 * </RoleGuard>
 *
 * @example
 * // 권한 없을 때 fallback 표시
 * <RoleGuard requiredRoles={['ROLE_ADMIN']} fallback={<div>권한이 없습니다.</div>}>
 *   <AdminPanel />
 * </RoleGuard>
 */
export default function RoleGuard({
    children,
    requiredRoles = [],
    requireAll = false,
    fallback = null
}) {
    const { roles } = useAuth();

    // requiredRoles가 비어있으면 모든 사용자에게 표시
    if (!requiredRoles || requiredRoles.length === 0) {
        return children;
    }

    // 권한 체크
    const hasPermission = requireAll
        ? hasAllRoles(roles, requiredRoles)
        : hasAnyRole(roles, requiredRoles);

    // 권한이 있으면 children 렌더링, 없으면 fallback 렌더링
    return hasPermission ? children : fallback;
}
