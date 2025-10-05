import { useAuth } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { send } from '@/util/ClientUtil';

function PrivateRoute({ children }) {
    const { isLoggedIn, setIsLoggedIn } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [checking, setChecking] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    // Guard for stale async results when effect re-runs
    const runIdRef = useRef(0);
    // Ensure one alert per check (and do not show on '/')
    const alertShownRef = useRef(false);

    useEffect(() => {
        const myId = ++runIdRef.current;
        alertShownRef.current = false;

        const atRoot = window.location.pathname === '/';

        const run = async () => {
            // 이미 로그인 상태면 추가 검사 없이 통과
            if (isLoggedIn === true) {
                setHasChecked(true);
                return;
            }

            setChecking(true);
            try {
                const { data } = await send('/dart/member/me', {}, 'GET');
                if (runIdRef.current !== myId) return; // newer run exists

                const ok = !!(data && data.success);
                setIsLoggedIn(ok);
                setHasChecked(true);

                if (!ok && !atRoot && !alertShownRef.current) {
                    alertShownRef.current = true;
                    alert('로그인이 필요합니다.');
                    navigate('/', { replace: true, state: { from: location } });
                }
            } catch (e) {
                if (runIdRef.current !== myId) return; // newer run exists
                setIsLoggedIn(false);
                setHasChecked(true);

                if (!atRoot && !alertShownRef.current) {
                    alertShownRef.current = true;
                    alert('로그인이 필요합니다.');
                    navigate('/', { replace: true, state: { from: location } });
                }
            } finally {
                if (runIdRef.current === myId) setChecking(false);
            }
        };

        run();
        // no cleanup: runIdRef guards staleness
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const atRoot = location.pathname === '/';

    // 검사 전/검사 중: 보호 라우트는 잠시 막고, 홈('/')은 항상 렌더
    if (!hasChecked || checking) {
        return atRoot ? children : null;
    }

    // 미로그인: 보호 라우트만 막고, 홈('/')은 렌더
    if (isLoggedIn === false) {
        return atRoot ? children : null;
    }

    return children;
}

export default PrivateRoute;