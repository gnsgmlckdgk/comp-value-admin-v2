/**
 * 권한 관리 유틸리티
 * 사용자의 roles 배열을 기반으로 권한을 체크하는 함수들을 제공합니다.
 */

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 * @param {Array<string>} userRoles - 사용자의 권한 배열
 * @param {string} requiredRole - 필요한 권한
 * @returns {boolean} 권한 보유 여부
 */
export const hasRole = (userRoles, requiredRole) => {
    if (!Array.isArray(userRoles)) return false;
    return userRoles.includes(requiredRole);
};

/**
 * 사용자가 여러 권한 중 하나라도 가지고 있는지 확인
 * @param {Array<string>} userRoles - 사용자의 권한 배열
 * @param {Array<string>} requiredRoles - 필요한 권한들 (하나라도 있으면 됨)
 * @returns {boolean} 권한 보유 여부
 */
export const hasAnyRole = (userRoles, requiredRoles) => {
    if (!Array.isArray(userRoles) || !Array.isArray(requiredRoles)) return false;
    return requiredRoles.some(role => userRoles.includes(role));
};

/**
 * 사용자가 모든 권한을 가지고 있는지 확인
 * @param {Array<string>} userRoles - 사용자의 권한 배열
 * @param {Array<string>} requiredRoles - 필요한 권한들 (모두 있어야 함)
 * @returns {boolean} 권한 보유 여부
 */
export const hasAllRoles = (userRoles, requiredRoles) => {
    if (!Array.isArray(userRoles) || !Array.isArray(requiredRoles)) return false;
    return requiredRoles.every(role => userRoles.includes(role));
};

/**
 * localStorage에서 roles를 가져옴
 * @returns {Array<string>} 저장된 권한 배열
 */
export const getRolesFromStorage = () => {
    try {
        const rolesStr = localStorage.getItem('roles');
        return rolesStr ? JSON.parse(rolesStr) : [];
    } catch (error) {
        console.error('Failed to parse roles from localStorage:', error);
        return [];
    }
};

/**
 * 권한 기반 메뉴 필터링
 * @param {Array} menuItems - 메뉴 항목 배열
 * @param {Array<string>} userRoles - 사용자의 권한 배열
 * @returns {Array} 권한에 맞는 메뉴 항목만 반환
 */
export const filterMenuByRole = (menuItems, userRoles) => {
    if (!Array.isArray(menuItems)) return [];
    if (!Array.isArray(userRoles) || userRoles.length === 0) return menuItems;

    return menuItems.filter(item => {
        // requiredRoles가 없으면 모든 사용자에게 표시
        if (!item.requiredRoles || !Array.isArray(item.requiredRoles) || item.requiredRoles.length === 0) {
            return true;
        }

        // requiredRoles 중 하나라도 가지고 있으면 표시
        return hasAnyRole(userRoles, item.requiredRoles);
    });
};

/**
 * 권한별 상수 정의 (필요시 추가)
 */
export const ROLES = {
    SUPER_ADMIN: 'ROLE_SUPER_ADMIN',
    ADMIN: 'ROLE_ADMIN',
    USER: 'ROLE_USER',
    // 필요한 권한을 여기에 추가
};
