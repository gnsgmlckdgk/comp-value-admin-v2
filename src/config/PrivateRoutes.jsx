import { useAuth } from '@/context/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { send } from '@/util/ClientUtil';

function PrivateRoute({ children }) {

    const { isLoggedIn, setIsLoggedIn } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        let active = true;

        const run = async () => {
            // 이미 로그인 true면 검사 생략하고 체크 완료 표시
            if (isLoggedIn === true) {
                setHasChecked(true);
                return;
            }

            setChecking(true);
            try {
                const { data } = await send('/dart/member/me', {}, 'GET');
                if (!active) return;
                const ok = !!(data && data.success);
                const isRoot = location.pathname === '/';
                setIsLoggedIn(ok);
                setHasChecked(true);
                if (!ok && !isRoot) {
                    alert('로그인이 필요합니다.');
                    navigate('/', { replace: true });
                }
            } catch (e) {
                if (!active) return;
                setIsLoggedIn(false);
                setHasChecked(true);
                alert('로그인이 필요합니다.');
                navigate('/', { replace: true });
            } finally {
                if (active) setChecking(false);
            }
        };

        run();
        return () => { active = false; };
    }, [location.pathname, isLoggedIn, navigate, setIsLoggedIn]);

    // 아직 검사 전이거나 검사 중이면 아무 것도 렌더하지 않음 (깜빡임/되돌림 방지)
    if (!hasChecked || checking) {
        return null;
    }

    if (isLoggedIn === false && location.pathname !== '/') {
        return <Navigate to="/" replace state={{ from: location }} />;
    }

    return children;
}

export default PrivateRoute;