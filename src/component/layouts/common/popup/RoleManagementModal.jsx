import { useState, useEffect } from 'react';
import Button from '@/component/common/button/Button';
import useModalAnimation from '@/hooks/useModalAnimation';

export default function RoleManagementModal({ open, member, allRoles, onClose, onSave }) {
    const [selectedRoles, setSelectedRoles] = useState([]);

    useEffect(() => {
        if (member && member.roles) {
            setSelectedRoles([...member.roles]);
        }
    }, [member]);

    const { shouldRender, isAnimatingOut } = useModalAnimation(open);

    if (!shouldRender || !member) return null;

    const toggleRole = (roleName) => {
        if (selectedRoles.includes(roleName)) {
            setSelectedRoles(selectedRoles.filter(r => r !== roleName));
        } else {
            setSelectedRoles([...selectedRoles, roleName]);
        }
    };

    const handleSave = () => {
        const addedRoles = selectedRoles.filter(r => !member.roles.includes(r));
        const removedRoles = member.roles.filter(r => !selectedRoles.includes(r));
        onSave(member, addedRoles, removedRoles);
    };

    const handleCancel = () => {
        setSelectedRoles(member.roles ? [...member.roles] : []);
        onClose();
    };

    const getRoleDisplayName = (roleName) => {
        const role = allRoles.find(r => r.roleName === roleName);
        return role ? (role.description || role.roleDisplayName || roleName) : roleName;
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 px-4 animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`} style={{ animationDuration: '0.25s' }}>
            <div className={`w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:text-white dark:ring-slate-700 animate__animated ${isAnimatingOut ? 'animate__fadeOutDown' : 'animate__fadeInUp'}`} style={{ animationDuration: '0.25s' }}>
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                    권한 관리
                </h2>

                <div className="mb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        회원: <span className="font-medium text-slate-900 dark:text-white">{member.nickname || member.username}</span>
                    </p>
                </div>

                <div className="mb-6 space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        권한 선택:
                    </p>
                    {allRoles.map(role => (
                        <label
                            key={role.roleName}
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={selectedRoles.includes(role.roleName)}
                                onChange={() => toggleRole(role.roleName)}
                                className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {getRoleDisplayName(role.roleName)}
                                </p>
                                {role.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {role.roleName}
                                    </p>
                                )}
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        취소
                    </button>
                    <Button
                        onClick={handleSave}
                        className="px-4 py-2"
                    >
                        저장
                    </Button>
                </div>
            </div>
        </div>
    );
}
