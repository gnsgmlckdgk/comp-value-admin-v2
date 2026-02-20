import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SSE 기반 실시간 모니터링 훅
 * LogStreamPopup.jsx 패턴 활용 — named events (snapshot / trade)
 */
export default function useMonitoringSSE() {
    const [snapshot, setSnapshot] = useState(null);
    const [trades, setTrades] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [resourceHistory, setResourceHistory] = useState([]);

    const eventSourceRef = useRef(null);
    const isPausedRef = useRef(false);
    const MAX_TRADES = 100;
    const MAX_RESOURCE_HISTORY = 360; // 30분 * 10초 간격 ≈ 180, 여유분 포함

    const connectSSE = useCallback(() => {
        try {
            const eventSource = new EventSource('/dart/monitoring/stream');
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                setIsConnected(true);
            };

            // named event: snapshot
            eventSource.addEventListener('snapshot', (event) => {
                if (isPausedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    setSnapshot(data);

                    // 리소스 히스토리 누적
                    if (data.resources && data.resources.containers && data.resources.containers.length > 0) {
                        setResourceHistory(prev => {
                            const next = [...prev, { ...data.resources, ts: Date.now() }];
                            return next.length > MAX_RESOURCE_HISTORY
                                ? next.slice(next.length - MAX_RESOURCE_HISTORY)
                                : next;
                        });
                    }
                } catch (e) {
                    console.error('snapshot parse error:', e);
                }
            });

            // named event: trade
            eventSource.addEventListener('trade', (event) => {
                if (isPausedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    setTrades(prev => {
                        const next = [data, ...prev];
                        return next.length > MAX_TRADES ? next.slice(0, MAX_TRADES) : next;
                    });
                } catch (e) {
                    console.error('trade parse error:', e);
                }
            });

            eventSource.onerror = () => {
                setIsConnected(false);
                eventSource.close();

                // 자동 재연결 (3초 후)
                setTimeout(() => {
                    if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
                        connectSSE();
                    }
                }, 3000);
            };
        } catch (error) {
            console.error('SSE 연결 실패:', error);
            setIsConnected(false);
        }
    }, []);

    // visibilityState 기반 일시정지
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                isPausedRef.current = true;
                setIsPaused(true);
            } else {
                isPausedRef.current = false;
                setIsPaused(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // 연결/해제
    useEffect(() => {
        connectSSE();
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [connectSSE]);

    const togglePause = useCallback(() => {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
    }, []);

    return {
        snapshot,
        trades,
        isConnected,
        isPaused,
        togglePause,
        resourceHistory,
    };
}
