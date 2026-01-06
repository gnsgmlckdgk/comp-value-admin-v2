// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// 1. Context 생성
// 전역에서 로그인 상태를 공유하기 위해 AuthContext를 만듬
const AuthContext = createContext();

// 세션 초기 TTL (초)
const SESSION_INITIAL_TTL = 1800;

// 2. Provider 컴포넌트 정의
// 이 컴포넌트로 감싼 하위 컴포넌트들은 로그인 상태에 접근 가능
export function AuthProvider({ children }) {
    // 로그인 상태를 관리하는 state - localStorage에서 초기값 복원
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return !!localStorage.getItem('userName');
    });
    const [userName, setUserName] = useState(() => {
        return localStorage.getItem('userName') || '';
    });
    const [nickName, setNickName] = useState(() => {
        return localStorage.getItem('nickName') || '';
    });
    const [roles, setRoles] = useState(() => {
        const storedRoles = localStorage.getItem('roles');
        return storedRoles ? JSON.parse(storedRoles) : [];
    });

    // 세션 TTL 관리
    const [sessionTTL, setSessionTTL] = useState(null);
    const timerRef = useRef(null);

    // 타이머 시작/재시작
    const startSessionTimer = useCallback((initialTTL = SESSION_INITIAL_TTL) => {
        // 기존 타이머 정리
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setSessionTTL(initialTTL);

        // 1초마다 카운트다운
        timerRef.current = setInterval(() => {
            setSessionTTL(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // 타이머 리셋 (API 호출 성공 시)
    const resetSessionTimer = useCallback(() => {
        if (isLoggedIn) {
            startSessionTimer(SESSION_INITIAL_TTL);
        }
    }, [isLoggedIn, startSessionTimer]);

    // 타이머 정지
    const stopSessionTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setSessionTTL(null);
    }, []);

    // 세션 TTL 동기화 (서버에서 받은 값으로)
    const syncSessionTTL = useCallback((ttl) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setSessionTTL(ttl);

        timerRef.current = setInterval(() => {
            setSessionTTL(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // 로그아웃 시 타이머 정리
    useEffect(() => {
        if (!isLoggedIn) {
            stopSessionTimer();
        }
    }, [isLoggedIn, stopSessionTimer]);

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    return (
        // value 객체로 로그인 상태와 변경 함수 전달
        <AuthContext.Provider value={{
            isLoggedIn, setIsLoggedIn,
            userName, setUserName,
            nickName, setNickName,
            roles, setRoles,
            sessionTTL, startSessionTimer, resetSessionTimer, stopSessionTimer, syncSessionTTL
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// 3. Custom Hook: useAuth
// useContext로 AuthContext에 접근하는 로직을 함수로 래핑
// 컴포넌트에서 import해서 간단히 로그인 상태를 가져올 수 있게 함
export function useAuth() {
    return useContext(AuthContext);
}