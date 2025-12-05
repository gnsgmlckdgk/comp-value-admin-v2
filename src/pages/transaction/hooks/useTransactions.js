import { useState, useEffect } from 'react';
import {
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    fetchFxRate,
    fetchCurrentPricesBySymbols,
} from '../services/TransactionService';
import { sortRowsBySymbolAndDate } from '../utils/sorting';
import { INITIAL_NEW_ROW } from '../constants';

/**
 * 거래 목록 관리 커스텀 훅
 */
export function useTransactions(openAlert = (msg) => alert(msg), openConfirm = (msg) => confirm(msg)) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    // 최초 로드 시 목록 조회
    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const list = await fetchTransactions();
            setRows(sortRowsBySymbolAndDate(list));
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    };

    const addTransaction = async (payload, mergePricesBySymbols) => {
        if (!payload.symbol) {
            openAlert('티커를 입력해주세요.');
            return false;
        }

        setSaving(true);
        try {
            // 기존 현재가 보존
            const prevPriceBySym = new Map(
                rows.map((r) => [String(r.symbol || '').toUpperCase(), r.currentPrice])
            );

            // 등록
            await createTransaction(payload);

            // 목록 재조회
            const list = await fetchTransactions();

            // 기존 현재가 머지
            const merged = list.map((r) => {
                const sym = String(r.symbol || '').toUpperCase();
                const prevCp = prevPriceBySym.get(sym);
                return (prevCp !== undefined && prevCp !== null && prevCp !== '')
                    ? { ...r, currentPrice: prevCp }
                    : r;
            });
            setRows(sortRowsBySymbolAndDate(merged));

            // 모든 심볼의 현재가 동기화
            const allSymbols = Array.from(new Set(merged.map((r) => r.symbol)));
            await mergePricesBySymbols(allSymbols);

            setLastUpdated(new Date());
            return true;
        } catch (e) {
            openAlert('등록에 실패했습니다.');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const updateTransactionField = async (id, field, value) => {
        setSaving(true);
        try {
            const updated = await updateTransaction(id, { [field]: value });

            setRows((prev) => {
                const newRows = prev.map((r) => {
                    if (r.id === id) {
                        // currentPrice는 프론트에서만 관리되는 필드이므로 절대 덮어쓰면 안됨
                        // 백엔드 응답에서 currentPrice를 제외하고 나머지만 업데이트
                        const { currentPrice: _, ...backendData } = updated || {};

                        // 기존 row에 백엔드 데이터를 머지 (currentPrice는 보존됨)
                        return { ...r, ...backendData };
                    }
                    return r;
                });
                return newRows;
            });
            return true;
        } catch (e) {
            openAlert('수정에 실패했습니다.');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const removeTransaction = async (id) => {
        if (!openConfirm('삭제하시겠어요?')) return false;

        setSaving(true);
        try {
            await deleteTransaction(id);
            const list = await fetchTransactions();
            setRows(sortRowsBySymbolAndDate(list));
            setLastUpdated(new Date());
            return true;
        } catch (e) {
            openAlert('삭제에 실패했습니다.');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const mergePricesBySymbols = async (symbols = []) => {
        const unique = Array.from(
            new Set(symbols.filter(Boolean).map((s) => String(s).toUpperCase()))
        );
        if (unique.length === 0) return;

        const priceList = await fetchCurrentPricesBySymbols(unique);
        const bySym = new Map(priceList.map((p) => [String(p.symbol).toUpperCase(), p]));

        setRows((prev) =>
            prev.map((r) => {
                const sym = String(r.symbol || '').toUpperCase();
                const hit = bySym.get(sym);
                return hit ? { ...r, currentPrice: Number(hit.currentPrice) } : r;
            })
        );
        setLastUpdated(new Date());
    };

    return {
        rows,
        loading,
        saving,
        lastUpdated,
        addTransaction,
        updateTransactionField,
        removeTransaction,
        mergePricesBySymbols,
    };
}
