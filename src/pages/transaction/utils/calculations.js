import { toNum } from './formatters';

/**
 * 전체 합계 계산
 * @param {Array} rows - 거래 행 목록
 * @returns {Object} 매수 합계, 현재가 합계
 */
export function calculateTotals(rows) {
    return rows.reduce((acc, r) => {
        const qty = toNum(r.totalBuyAmount);
        const buy = toNum(r.buyPrice);
        const cur = toNum(r.currentPrice);
        acc.buySum += buy * qty;
        acc.curSum += cur * qty;
        return acc;
    }, { buySum: 0, curSum: 0 });
}

/**
 * 차익과 수익률 계산
 * @param {number} buySum - 총 매수금액
 * @param {number} curSum - 총 현재가치
 * @returns {Object} 차익, 수익률
 */
export function calculateDiffAndPercent(buySum, curSum) {
    const diff = curSum - buySum;
    const diffPct = buySum > 0 ? (diff / buySum) * 100 : 0;
    return { diff, diffPct };
}
