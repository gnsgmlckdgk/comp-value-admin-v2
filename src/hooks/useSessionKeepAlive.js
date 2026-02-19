import { useEffect, useRef } from 'react';
import { send } from '@/util/ClientUtil';

// 세션 유지 주기 (3분)
const KEEP_ALIVE_INTERVAL = 3 * 60 * 1000;

/**
 * 대량 작업 등 장시간 처리 중 세션이 만료되지 않도록 주기적으로 서버에 ping
 * @param {boolean} isActive - true일 때만 keep-alive 동작
 */
export default function useSessionKeepAlive(isActive) {
    const intervalRef = useRef(null);

    useEffect(() => {
        if (isActive) {
            intervalRef.current = setInterval(async () => {
                try {
                    await send('/dart/member/me/info', {}, 'GET');
                } catch {
                    // 실패해도 무시 (다음 주기에 재시도)
                }
            }, KEEP_ALIVE_INTERVAL);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive]);
}
