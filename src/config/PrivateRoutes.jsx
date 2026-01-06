import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { send } from '@/util/ClientUtil';

// 로그인 없이 접근 가능한 공개 페이지 목록
const PUBLIC_ROUTES = [
    '/',
    '/member/join'
];

// 경로가 공개 페이지인지 확인하는 헬퍼 함수
const isPublicRoute = (pathname) => {
    return PUBLIC_ROUTES.some(route => {
        // 정확히 일치하는 경로
        if (route === pathname) return true;
        // 와일드카드 패턴 지원 (필요시 확장 가능)
        // 예: '/public/*' 같은 패턴
        return false;
    });
};

function PrivateRoute({ children }) {
    const { isLoggedIn, setIsLoggedIn } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [checking, setChecking] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    // Guard for stale async results when effect re-runs
    const runIdRef = useRef(0);

    useEffect(() => {
        const myId = ++runIdRef.current;
        const run = async () => {
            setChecking(true);
            try {
                const { data } = await send('/dart/member/me', {}, 'GET');
                if (runIdRef.current !== myId) return; // newer run exists

                const ok = !!(data && data.success);
                setIsLoggedIn(ok);
                setHasChecked(true);
            } catch (e) {
                if (runIdRef.current !== myId) return; // newer run exists
                setIsLoggedIn(false);
                setHasChecked(true);
            } finally {
                if (runIdRef.current === myId) setChecking(false);
            }
        };

        run();
        // no cleanup: runIdRef guards staleness
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const isPublic = isPublicRoute(location.pathname);

    // 검사 전/검사 중: 보호 라우트는 잠시 막고, 공개 페이지는 항상 렌더
    if (!hasChecked || checking) {
        return isPublic ? children : null;
    }

    // 미로그인: 보호 라우트만 막고, 공개 페이지는 렌더
    if (isLoggedIn === false) {
        if (isPublic) return children;

        // 보호된 페이지에서 미로그인일 때: 안내 다이어그램 + 로그인 유도
        return (
            <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                            className="h-7 w-7"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h9.75A2.25 2.25 0 0019.5 18.75V12M12 9h7.5M15.75 5.25L19.5 9"
                            />
                        </svg>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">로그인이 필요합니다</h2>
                    <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        선택하신 메뉴는 로그인 후 이용할 수 있는 기능입니다.
                        <br />
                        로그인하면 보유 종목, 기업가치 분석 등 더 많은 서비스를 사용할 수 있어요.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('auth:login:open'));
                            }}
                            className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-sky-600 hover:to-indigo-600"
                        >
                            로그인하기
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-200"
                        >
                            홈으로 가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return children;
}

export default PrivateRoute;