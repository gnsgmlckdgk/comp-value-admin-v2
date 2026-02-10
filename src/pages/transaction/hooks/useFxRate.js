import { useState, useEffect } from 'react';
import { fetchFxRate } from '../services/TransactionService';

/**
 * 환율 정보 관리 커스텀 훅
 */
export function useFxRate({ enabled = true } = {}) {
    const [fxRate, setFxRate] = useState(null);
    const [fxUpdatedAt, setFxUpdatedAt] = useState(null);

    useEffect(() => {
        if (enabled) loadFxRate();
    }, [enabled]);

    const loadFxRate = async () => {
        try {
            const fx = await fetchFxRate();
            setFxRate(fx?.rate ?? null);
            setFxUpdatedAt(fx?.updatedAt ? new Date(fx.updatedAt) : new Date());
        } catch (e) {
            // 무시
        }
    };

    const refreshFxRate = async () => {
        const fx = await fetchFxRate();
        setFxRate(fx?.rate ?? fxRate);
        setFxUpdatedAt(fx?.updatedAt ? new Date(fx.updatedAt) : new Date());
        return fx;
    };

    return {
        fxRate,
        fxUpdatedAt,
        refreshFxRate,
    };
}
