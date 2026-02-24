import { useEffect, useRef } from 'react';

const KEEP_ALIVE_INTERVAL = 3 * 60 * 1000;

/**
 * 대량 작업 등 장시간 처리 중 세션이 만료되지 않도록 주기적으로 서버에 ping
 * - Web Worker 기반: 브라우저 백그라운드 탭 스로틀링 영향 없음
 * - Worker 미지원 시 setInterval 폴백
 * @param {boolean} isActive - true일 때만 keep-alive 동작
 */
export default function useSessionKeepAlive(isActive) {
    const workerRef = useRef(null);
    const fallbackRef = useRef(null);

    useEffect(() => {
        if (!isActive) {
            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'stop' });
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (fallbackRef.current) {
                clearInterval(fallbackRef.current);
                fallbackRef.current = null;
            }
            return;
        }

        const keepaliveUrl = `${window.location.origin}/dart/member/session/keepalive`;

        const syncTTL = (sessionTTL) => {
            if (sessionTTL != null && sessionTTL > 0) {
                window.dispatchEvent(new CustomEvent('session:activity', {
                    detail: { sessionTTL }
                }));
            }
        };

        // Web Worker 시도
        try {
            const worker = new Worker(
                new URL('./keepalive-worker.js', import.meta.url)
            );
            workerRef.current = worker;

            worker.onmessage = (e) => {
                if (e.data.type === 'pong') {
                    syncTTL(e.data.sessionTTL);
                }
            };

            worker.postMessage({ type: 'start', url: keepaliveUrl });
        } catch {
            // Web Worker 미지원 시 setInterval 폴백
            const ping = async () => {
                try {
                    const res = await fetch(keepaliveUrl, {
                        method: 'GET', credentials: 'include'
                    });
                    const data = await res.json();
                    syncTTL(data?.response?.sessionTTL);
                } catch { /* 다음 주기에 재시도 */ }
            };
            ping();
            fallbackRef.current = setInterval(ping, KEEP_ALIVE_INTERVAL);
        }

        // 탭 복귀 시 폴백 모드에서 즉시 동기화
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (!workerRef.current && fallbackRef.current) {
                    fetch(keepaliveUrl, { method: 'GET', credentials: 'include' })
                        .then(r => r.json())
                        .then(data => syncTTL(data?.response?.sessionTTL))
                        .catch(() => {});
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'stop' });
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (fallbackRef.current) {
                clearInterval(fallbackRef.current);
                fallbackRef.current = null;
            }
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [isActive]);
}
