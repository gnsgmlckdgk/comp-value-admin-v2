// src/context/SessionContext.jsx
// 세션 타이머만 별도로 관리하여 다른 컴포넌트에 리렌더링 영향을 주지 않도록 분리
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const SessionContext = createContext();

// 세션 초기 TTL (초)
const SESSION_INITIAL_TTL = 1800;

export function SessionProvider({ children }) {
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
        startSessionTimer(SESSION_INITIAL_TTL);
    }, [startSessionTimer]);

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

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    return (
        <SessionContext.Provider value={{
            sessionTTL,
            startSessionTimer,
            resetSessionTimer,
            stopSessionTimer,
            syncSessionTTL
        }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    return useContext(SessionContext);
}
