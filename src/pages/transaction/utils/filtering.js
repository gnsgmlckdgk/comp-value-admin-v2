import { toNum } from './formatters';

/**
 * 검색어로 행 필터링 (symbol / companyName 대소문자 무시)
 */
export function filterBySearch(rows, searchText) {
    if (!searchText || !searchText.trim()) return rows;
    const q = searchText.trim().toLowerCase();
    return rows.filter(row => {
        const sym = String(row.symbol || '').toLowerCase();
        const name = String(row.companyName || '').toLowerCase();
        return sym.includes(q) || name.includes(q);
    });
}

/**
 * 수익/손실 필터링
 * mode: 'all' | 'profit' | 'loss'
 */
export function filterByPnl(rows, mode) {
    if (!mode || mode === 'all') return rows;
    return rows.filter(row => {
        const buy = toNum(row.buyPrice);
        const cur = toNum(row.currentPrice);
        if (mode === 'profit') return cur >= buy;
        if (mode === 'loss') return cur < buy;
        return true;
    });
}
