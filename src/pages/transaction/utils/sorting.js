/**
 * 심볼과 매수일 기준으로 행 정렬
 * @param {Array} list - 정렬할 거래 목록
 * @returns {Array} 정렬된 목록
 */
export function sortRowsBySymbolAndDate(list) {
    return [...list].sort((a, b) => {
        const sa = String(a.symbol || '').toUpperCase();
        const sb = String(b.symbol || '').toUpperCase();
        if (sa === sb) {
            const da = a.buyDate ? new Date(a.buyDate) : new Date(0);
            const db = b.buyDate ? new Date(b.buyDate) : new Date(0);
            return da - db; // ASC
        }
        return sa.localeCompare(sb);
    });
}
