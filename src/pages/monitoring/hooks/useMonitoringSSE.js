import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SSE 기반 실시간 모니터링 훅
 * named events: snapshot / trade / traffic
 */
export default function useMonitoringSSE() {
    const [snapshot, setSnapshot] = useState(null);
    const [trades, setTrades] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [resourceHistory, setResourceHistory] = useState([]);
    // 서비스별 트래픽: { http, db, redis, cointrader, ml }
    const [traffic, setTraffic] = useState({ http: 0, db: 0, redis: 0, cointrader: 0, ml: 0 });

    const eventSourceRef = useRef(null);
    const isPausedRef = useRef(false);
    const MAX_TRADES = 100;
    const MAX_RESOURCE_HISTORY = 360;

    const connectSSE = useCallback(() => {
        try {
            const eventSource = new EventSource('/dart/monitoring/stream');
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                setIsConnected(true);
            };

            // named event: snapshot (3초 간격)
            eventSource.addEventListener('snapshot', (event) => {
                if (isPausedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    setSnapshot(data);

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

            // named event: traffic (1초 간격 — 서비스별 트래픽 카운트)
            eventSource.addEventListener('traffic', (event) => {
                if (isPausedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    setTraffic(data);
                } catch (e) {
                    console.error('traffic parse error:', e);
                }
            });

            eventSource.onerror = () => {
                setIsConnected(false);
                eventSource.close();

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
        traffic,
    };
}
