import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';
import RedisManagementModal from '@/pages/member/popup/RedisManagementModal';

export default function MyProfile() {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState(null);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onAfterClose: null });

    // 회원탈퇴 관련 상태
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const deletePasswordRef = useRef(null);

    // Redis 관리 모달 상태
    const [showRedisModal, setShowRedisModal] = useState(false);

    const openAlert = (message, onAfterClose = null) => {
        setAlertConfig({ open: true, message, onAfterClose });
    };

    useEffect(() => {
        fetchUserInfo();
        fetchRoles();
    }, []);

    const fetchUserInfo = async () => {
        setLoading(true);
        try {
            const { data, error } = await send('/dart/member/me/info', {}, 'GET');
            if (error) {
                openAlert('회원 정보를 불러오는데 실패했습니다.');
            } else if (data?.success && data?.response) {
                setUserInfo(data.response);
            }
        } catch (e) {
            console.error('회원 정보 조회 실패:', e);
            openAlert('회원 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const { data, error } = await send('/dart/role', {}, 'GET');
            if (!error && data?.success && data?.response) {
                setRoles(data.response);
            }
        } catch (e) {
            console.error('권한 목록 조회 실패:', e);
        }
    };

    const getRoleDisplayName = (roleName) => {
        const role = roles.find(r => r.roleName === roleName);
        return role ? role.description : roleName;
    };

    const handleEditProfile = () => {
        navigate('/member/myprofile/edit');
    };

    const handleDeleteAccount = () => {
        setShowDeleteModal(true);
        setDeletePassword('');
        setTimeout(() => {
            deletePasswordRef.current?.focus();
        }, 100);
    };

    const handleDeleteConfirm = async () => {
        if (!deletePassword.trim()) {
            openAlert('비밀번호를 입력해주세요.');
            return;
        }

        setDeleteLoading(true);
        try {
            const { data, error } = await send('/dart/member/delete', { password: deletePassword }, 'POST');
            if (error) {
                setShowDeleteModal(false);
                openAlert(error);
            } else if (data?.success) {
                setShowDeleteModal(false);
                // 로그아웃 처리 (auth:logout 이벤트 없이 직접 처리)
                localStorage.setItem('isLoggedIn', 'false');
                localStorage.removeItem('nickName');
                openAlert('회원탈퇴가 완료되었습니다.', () => {
                    navigate('/');
                    window.location.reload();
                });
            } else {
                setShowDeleteModal(false);
                openAlert(data?.message || '회원탈퇴에 실패했습니다.');
            }
        } catch (e) {
            console.error('회원탈퇴 실패:', e);
            setShowDeleteModal(false);
            openAlert('회원탈퇴 중 오류가 발생했습니다.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setDeletePassword('');
    };

    const handleManageMembers = () => {
        navigate('/member/management');
    };

    const handleOpenRedisManagement = () => {
        setShowRedisModal(true);
    };

    // 슈퍼관리자 또는 관리자인지 확인
    const isAdmin = userInfo?.roles?.includes('ROLE_ADMIN') || userInfo?.roles?.includes('ROLE_SUPER_ADMIN');

    if (loading) {
        return (
            <>
                <PageTitle />
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">회원 정보를 불러오는 중...</p>
                    </div>
                </div>
            </>
        );
    }

    if (!userInfo) {
        return (
            <>
                <PageTitle />
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">회원 정보를 불러올 수 없습니다</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <PageTitle />

            <div className="max-w-4xl mx-auto space-y-6 px-4 py-8">
                {/* 프로필 헤더 카드 */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white/30">
                            {userInfo.nickname?.charAt(0).toUpperCase() || userInfo.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold mb-2">{userInfo.nickname || userInfo.username}</h1>
                            <p className="text-blue-100 text-sm mb-3">{userInfo.email}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                {userInfo.roles?.map((role, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30"
                                    >
                                        {getRoleDisplayName(role)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 회원 정보 상세 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">기본 정보</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InfoItem label="사용자 ID" value={userInfo.username} />
                            <InfoItem label="닉네임" value={userInfo.nickname || '-'} />
                            <InfoItem label="이메일" value={userInfo.email || '-'} />
                            <InfoItem label="회원번호" value={userInfo.id} />
                            {userInfo.createdAt && (
                                <InfoItem
                                    label="가입일"
                                    value={new Date(userInfo.createdAt).toLocaleString('ko-KR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                />
                            )}
                            {userInfo.lastLoginAt && (
                                <InfoItem
                                    label="마지막 로그인"
                                    value={new Date(userInfo.lastLoginAt).toLocaleString('ko-KR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* 관리 */}
                {isAdmin && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">관리</h2>
                        </div>
                        <div className="p-6 space-y-3">
                            <button
                                onClick={handleOpenRedisManagement}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-slate-900 dark:text-white">메모리 관리</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">Redis 데이터를 조회, 수정, 삭제합니다</div>
                                    </div>
                                </div>
                                <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* 계정 관리 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">계정 관리</h2>
                    </div>
                    <div className="p-6 space-y-3">
                        <button
                            onClick={handleEditProfile}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-slate-900 dark:text-white">회원정보 수정</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">닉네임, 이메일 등을 변경합니다</div>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {isAdmin && (
                            <button
                                onClick={handleManageMembers}
                                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-slate-900 dark:text-white">회원 관리 (관리자)</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">다른 회원의 정보를 관리합니다</div>
                                    </div>
                                </div>
                                <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        <button
                            onClick={handleDeleteAccount}
                            className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-red-600 dark:text-red-400">회원 탈퇴</div>
                                    <div className="text-xs text-red-500/70 dark:text-red-400/70">계정을 영구적으로 삭제합니다</div>
                                </div>
                            </div>
                            <svg className="w-5 h-5 text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <AlertModal
                open={alertConfig.open}
                message={alertConfig.message}
                onClose={() => setAlertConfig({ open: false, message: '', onAfterClose: null })}
                onAfterClose={alertConfig.onAfterClose}
            />

            {/* Redis 관리 모달 */}
            <RedisManagementModal
                isOpen={showRedisModal}
                onClose={() => setShowRedisModal(false)}
            />

            {/* 회원탈퇴 비밀번호 확인 모달 */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 px-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:text-white dark:ring-slate-700">
                        <h2 className="mb-2 text-base font-semibold text-red-600 dark:text-red-400">회원 탈퇴</h2>
                        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                            탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.<br />
                            계속하시려면 비밀번호를 입력해주세요.
                        </p>
                        <div className="mb-5">
                            <Input
                                inputRef={deletePasswordRef}
                                label="비밀번호"
                                type="password"
                                value={deletePassword}
                                onChange={e => setDeletePassword(e.target.value)}
                                onEnter={handleDeleteConfirm}
                                wdfull={true}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleDeleteCancel}
                                disabled={deleteLoading}
                                className="px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleteLoading}
                                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {deleteLoading ? '처리 중...' : '탈퇴하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function InfoItem({ label, value }) {
    return (
        <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {label}
            </div>
            <div className="text-sm text-slate-900 dark:text-white font-medium">
                {value || '-'}
            </div>
        </div>
    );
}
