import { toNum } from './formatters';

/**
 * 같은 티커별로 그룹화하고 합계 행을 추가
 * @param {Array} rows - 거래 행 목록
 * @param {Number} currentFxRate - 현재 환율 (매수당시환율이 없는 경우 사용)
 * @returns {Array} 그룹화된 행 목록
 */
export function groupRowsBySymbol(rows, currentFxRate = 0) {
    const out = [];
    let i = 0;
    const n = rows.length;

    while (i < n) {
        const start = i;
        const sym = String(rows[i].symbol || '').toUpperCase();
        let end = i;

        // 같은 심볼인 행들을 찾음
        while (end < n && String(rows[end].symbol || '').toUpperCase() === sym) {
            end++;
        }

        const count = end - start;

        // 2개 이상인 경우 그룹으로 처리
        if (count >= 2) {
            // 그룹 시작을 표시하는 구분선 추가
            out.push({ __type: 'groupStartDivider', symbol: sym });

            // 그룹 행들 추가
            for (let k = start; k < end; k++) {
                out.push({
                    ...rows[k],
                    __groupKey: sym,
                    __isGroupStart: k === start,
                    __isGroupEnd: k === end - 1,
                });
            }

            // 합계 행 추가
            out.push(createGroupTotalRow(rows.slice(start, end), sym, end, n, rows, currentFxRate));
        } else {
            // 단일 행은 그대로 추가
            for (let k = start; k < end; k++) {
                out.push(rows[k]);
            }
        }

        i = end;
    }

    return out;
}

/**
 * 그룹 합계 행 생성
 */
function createGroupTotalRow(slice, sym, end, n, rows, currentFxRate) {
    const qtySum = slice.reduce((s, r) => s + toNum(r.totalBuyAmount), 0);
    const buySumUSD = slice.reduce((s, r) => s + toNum(r.buyPrice) * toNum(r.totalBuyAmount), 0);
    const curSumUSD = slice.reduce((s, r) => s + toNum(r.currentPrice) * toNum(r.totalBuyAmount), 0);
    const diffUSD = curSumUSD - buySumUSD;
    const diffPct = buySumUSD > 0 ? (diffUSD / buySumUSD) * 100 : 0;

    // 매수가격: 가중 평균 (총매수금액 / 총수량)
    const buyAvgUSD = qtySum > 0 ? buySumUSD / qtySum : 0;

    // 현재가: 평균값 사용 (빈 값 제외)
    const curList = slice.map(r => toNum(r.currentPrice)).filter(v => v > 0);
    const curUSD = curList.length ? (curList.reduce((a, b) => a + b, 0) / curList.length) : 0;

    // 매도목표가: 평균값 (빈 값 제외)
    const tgtList = slice.map(r => toNum(r.targetPrice)).filter(v => v > 0);
    const targetAvgUSD = tgtList.length ? (tgtList.reduce((a, b) => a + b, 0) / tgtList.length) : 0;

    // 매수당시환율: 가중 평균 (환율이 없는 행은 현재환율 사용)
    // 현재환율이 없으면 계산하지 않음
    let buyExchangeRateAvg = 0;
    if (currentFxRate && currentFxRate > 0) {
        const ratesWithQty = slice
            .map(r => ({
                rate: toNum(r.buyExchangeRateAtTrade) || currentFxRate, // 없으면 현재환율 사용
                qty: toNum(r.totalBuyAmount)
            }))
            .filter(item => item.qty > 0);

        if (ratesWithQty.length > 0) {
            const totalWeightedRate = ratesWithQty.reduce((sum, item) => sum + (item.rate * item.qty), 0);
            const totalQty = ratesWithQty.reduce((sum, item) => sum + item.qty, 0);
            buyExchangeRateAvg = totalQty > 0 ? totalWeightedRate / totalQty : 0;
        }
    } else {
        // 현재환율이 없는 경우 환율이 있는 항목만 평균
        const ratesWithQty = slice
            .map(r => ({ rate: toNum(r.buyExchangeRateAtTrade), qty: toNum(r.totalBuyAmount) }))
            .filter(item => item.rate > 0 && item.qty > 0);

        if (ratesWithQty.length > 0) {
            const totalWeightedRate = ratesWithQty.reduce((sum, item) => sum + (item.rate * item.qty), 0);
            const totalQty = ratesWithQty.reduce((sum, item) => sum + item.qty, 0);
            buyExchangeRateAvg = totalQty > 0 ? totalWeightedRate / totalQty : 0;
        }
    }

    // 다음 청크가 그룹인지 확인
    const nextIsGroup = isNextChunkGroup(end, n, rows);

    // 기업명 (첫 번째 행에서 가져옴)
    const companyName = slice[0]?.companyName || '';

    return {
        __type: 'groupTotal',
        symbol: sym,
        companyName,
        qtySum,
        buySumUSD,
        curSumUSD,
        diffUSD,
        diffPct,
        buyAvgUSD,
        curUSD,
        targetAvgUSD,
        buyExchangeRateAtTrade: buyExchangeRateAvg,
        hasNextGroupDivider: nextIsGroup,
        groupRows: slice, // 매도 처리를 위한 원본 행 데이터
    };
}

/**
 * 다음 청크가 그룹인지 확인
 */
function isNextChunkGroup(end, n, rows) {
    if (end >= n) return false;

    const nextSym = String(rows[end].symbol || '').toUpperCase();
    let j = end;
    while (j < n && String(rows[j].symbol || '').toUpperCase() === nextSym) {
        j++;
    }
    const nextCount = j - end;
    return nextCount >= 2;
}
