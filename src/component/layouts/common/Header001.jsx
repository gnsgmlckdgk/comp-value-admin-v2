import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import routes from '@/config/routes';
import { send } from '@/util/ClientUtil';
import { useAuth } from '@/context/AuthContext';

import LoginModal from '@/component/layouts/common/popup/LoginModal';
import AlertModal from '@/component/layouts/common/popup/AlertModal';

export default function Header001({ onMenuClick }) {
    const [title] = useState('CompValue');
    const [showLogin, setShowLogin] = useState(false);

    const { isLoggedIn, setIsLoggedIn, userName, setUserName, nickName, setNickName, roles, setRoles } = useAuth();

    const [password, setPassWord] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });

    const navigate = useNavigate();

    const openAlert = (message, onConfirm) => {
        setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    };

    const handleCloseAlert = () => {
        const { onConfirm } = alertConfig;
        setAlertConfig({ open: false, message: '', onConfirm: null });
        if (onConfirm) onConfirm();
    };

    useEffect(() => {
        const onForceLogout = () => {
            setIsLoggedIn(false);
            setUserName && setUserName('');
            setNickName && setNickName('');
            setRoles && setRoles([]);
            setPassWord('');
            setShowLogin(false);

            try {
                openAlert('인증정보가 존재하지 않습니다.', () => {
                    navigate('/', { replace: true, state: { reason: '401' } });
                });
            } catch {
                window.location.href = '/';
            }
        };

        const onOpenLogin = () => {
            setPassWord('');
            setShowLogin(true);
        };

        window.addEventListener('auth:logout', onForceLogout);
        window.addEventListener('auth:login:open', onOpenLogin);

        return () => {
            window.removeEventListener('auth:logout', onForceLogout);
            window.removeEventListener('auth:login:open', onOpenLogin);
        };
    }, [setIsLoggedIn, setNickName, setUserName, setRoles, navigate]);

    const login = async () => {
        const sendUrl = `/dart/member/login`;

        setIsLoading(true);

        const { data, error } = await send(
            sendUrl,
            {
                username: userName,
                password: password,
            },
            'POST'
        );

        setIsLoading(false);

        if (error == null) {
            const sessionKey = data.response ? data.response.sessionKey : null;

            if (sessionKey == null) {
                openAlert('인증 실패');
            } else {
                const res = data.response || {};
                const nextUserName = res.username ?? userName;
                const nextNick = res.nickName ?? nextUserName;
                const nextRoles = Array.isArray(res.roles) ? res.roles : (res.role ? [res.role] : []);

                console.log("[TEST] login res", res);

                localStorage.setItem('userName', nextUserName);
                localStorage.setItem('nickName', nextNick);
                localStorage.setItem('roles', JSON.stringify(nextRoles));

                setUserName(nextUserName);
                setNickName(nextNick);
                setRoles(nextRoles);
                setIsLoggedIn(true);
                setPassWord('');
                setShowLogin(false);
            }
        } else {
            openAlert(error);
        }
    };

    const logout = async () => {
        const sendUrl = `/dart/member/logout`;

        setIsLoading(true);

        const { data, error } = await send(sendUrl, {}, 'DELETE');
        if (error == null) {
            setIsLoggedIn(false);
            setUserName('');
            setNickName('');
            setRoles([]);
            setPassWord('');

            localStorage.removeItem('userName');
            localStorage.removeItem('nickName');
            localStorage.removeItem('roles');

            navigate('/', { replace: true, state: { reason: 'logout' } });
        } else {
            openAlert(error);
        }

        setIsLoading(false);
    };

    const displayName = localStorage.getItem('nickName') || localStorage.getItem('userName');

    return (
        <>
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="flex h-16 w-full items-center px-3 md:px-6">
                    <button
                        className="mr-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
                        onClick={onMenuClick}
                        aria-label="메뉴 열기"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <Link to={routes.Home.path} className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm">
                            <span className="text-lg font-bold">CV</span>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-base font-semibold text-slate-900">{title}</span>
                            <span className="text-[11px] text-slate-500 hidden sm:inline">기업가치 분석 & 포트폴리오</span>
                        </div>
                    </Link>

                    <div className="ml-auto flex items-center gap-4 text-sm">
                        {isLoggedIn && displayName && (
                            <div className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-slate-700 shadow-sm md:flex">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-400 text-xs font-semibold text-white">
                                    {displayName.charAt(0)}
                                </div>
                                <span className="max-w-[120px] truncate">{displayName} 님</span>
                            </div>
                        )}

                        {isLoggedIn ? (
                            <button
                                type="button"
                                onClick={logout}
                                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-sky-400 hover:text-sky-600 hover:shadow-sm"
                            >
                                로그아웃
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-sky-600 hover:to-indigo-600"
                                onClick={() => {
                                    setPassWord('');
                                    setShowLogin(true);
                                }}
                            >
                                로그인
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {showLogin && (
                <LoginModal
                    show={showLogin}
                    onClose={() => {
                        setShowLogin(false);
                        setPassWord('');
                    }}
                    onLogin={login}
                    isLoading={isLoading}
                    username={userName}
                    setUsername={setUserName}
                    password={password}
                    setPassword={setPassWord}
                />
            )}

            <AlertModal
                open={alertConfig.open}
                message={alertConfig.message}
                onClose={handleCloseAlert}
            />
        </>
    );
}