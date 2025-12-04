import { useAuth } from '@/context/AuthContext';
import { hasRole, hasAnyRole, hasAllRoles } from '@/util/RoleUtil';

/**
 * 권한 체크를 위한 커스텀 훅
 *
 * @example
 * const { roles, hasRole, hasAnyRole, hasAllRoles, isAdmin } = useRole();
 *
 * if (hasRole('ROLE_ADMIN')) {
 *   // 관리자 기능 실행
 * }
 *
 * if (isAdmin) {
 *   // 관리자 기능 실행
 * }
 */
export const useRole = () => {
    const { roles } = useAuth();

    return {
        roles,
        hasRole: (role) => hasRole(roles, role),
        hasAnyRole: (requiredRoles) => hasAnyRole(roles, requiredRoles),
        hasAllRoles: (requiredRoles) => hasAllRoles(roles, requiredRoles),
        // 자주 사용하는 권한 체크를 위한 편의 속성
        isAdmin: hasRole(roles, 'ROLE_ADMIN'),
        isUser: hasRole(roles, 'ROLE_USER'),
        isManager: hasRole(roles, 'ROLE_MANAGER'),
    };
};
