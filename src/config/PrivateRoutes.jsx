import { useAuth } from '@/context/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { send } from '@/util/ClientUtil';

function PrivateRoute({ children }) {

    const { isLoggedIn, setIsLoggedIn } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {

        const checkLogin = async () => {
            try {
                const { data } = await send('/dart/member/me', {}, 'GET');
                if (data && data.success) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                    if (location.pathname !== '/') {
                        alert('로그인이 필요합니다.');
                        navigate('/');
                    }
                }
            } catch (e) {
                setIsLoggedIn(false);
                if (location.pathname !== '/') {
                    alert('로그인이 필요합니다.');
                    navigate('/');
                }
            }
        };

        if ((isLoggedIn === null || isLoggedIn === false) && location.pathname !== '/') {
            checkLogin();
        }
        // eslint-disable-next-line
    }, [location.pathname]);

    if (isLoggedIn === false && location.pathname !== '/') {
        return <Navigate to="/" replace state={{ from: location }} />;
    }

    if (isLoggedIn === null) {
        return null;
    }

    return children;
}

export default PrivateRoute;