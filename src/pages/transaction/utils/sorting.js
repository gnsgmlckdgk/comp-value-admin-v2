import { toNum } from './formatters';

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

/**
 * 거래 데이터를 정렬 (티커별 그룹 유지)
 * @param {Array} rows - 원본 데이터 행
 * @param {number} columnIndex - 정렬할 컬럼 인덱스
 * @param {string} direction - 정렬 방향 ('asc' | 'desc')
 * @returns {Array} 정렬된 행
 */
export function sortTransactionRows(rows, columnIndex, direction) {
    if (!rows || rows.length === 0) return rows;

    // 티커별로 그룹화
    const grouped = groupBySymbol(rows);

    // 각 그룹 내부를 정렬
    const sortedGroups = grouped.map(group => {
        return sortGroup(group, columnIndex, direction);
    });

    // 그룹 자체를 정렬 (그룹의 대표값 기준)
    sortedGroups.sort((a, b) => {
        return compareGroupValues(a, b, columnIndex, direction);
    });

    // 평탄화
    return sortedGroups.flat();
}

/**
 * 티커별로 그룹화
 */
function groupBySymbol(rows) {
    const groups = [];
    let currentGroup = [];
    let currentSymbol = null;

    for (const row of rows) {
        const symbol = String(row.symbol || '').toUpperCase();

        if (symbol !== currentSymbol) {
            if (currentGroup.length > 0) {
                groups.push(currentGroup);
            }
            currentGroup = [row];
            currentSymbol = symbol;
        } else {
            currentGroup.push(row);
        }
    }

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
}

/**
 * 그룹 내부 정렬
 */
function sortGroup(group, columnIndex, direction) {
    if (group.length <= 1) return group;

    return [...group].sort((a, b) => {
        return compareValues(a, b, columnIndex, direction);
    });
}

/**
 * 그룹 간 비교 (그룹의 합계/평균값 사용)
 */
function compareGroupValues(groupA, groupB, columnIndex, direction) {
    let aVal, bVal;

    switch (columnIndex) {
        case 0: // 종목 - 첫 번째 행 기준
            aVal = String(groupA[0].symbol || '').toUpperCase();
            bVal = String(groupB[0].symbol || '').toUpperCase();
            break;
        case 1: // 매수가($) - 평균
            aVal = groupA.reduce((sum, row) => sum + toNum(row.buyPrice), 0) / groupA.length;
            bVal = groupB.reduce((sum, row) => sum + toNum(row.buyPrice), 0) / groupB.length;
            break;
        case 2: // 현재가($) - 평균
            aVal = groupA.reduce((sum, row) => sum + toNum(row.currentPrice), 0) / groupA.length;
            bVal = groupB.reduce((sum, row) => sum + toNum(row.currentPrice), 0) / groupB.length;
            break;
        case 3: // 수량 - 합계
            aVal = groupA.reduce((sum, row) => sum + toNum(row.totalBuyAmount), 0);
            bVal = groupB.reduce((sum, row) => sum + toNum(row.totalBuyAmount), 0);
            break;
        case 4: // 매수금액($) - 합계
            aVal = groupA.reduce((sum, row) => sum + toNum(row.buyPrice) * toNum(row.totalBuyAmount), 0);
            bVal = groupB.reduce((sum, row) => sum + toNum(row.buyPrice) * toNum(row.totalBuyAmount), 0);
            break;
        case 5: // 평가금액($) - 합계
            aVal = groupA.reduce((sum, row) => sum + toNum(row.currentPrice) * toNum(row.totalBuyAmount), 0);
            bVal = groupB.reduce((sum, row) => sum + toNum(row.currentPrice) * toNum(row.totalBuyAmount), 0);
            break;
        case 6: // 손익 - 합계
            aVal = groupA.reduce((sum, row) => sum + (toNum(row.currentPrice) - toNum(row.buyPrice)) * toNum(row.totalBuyAmount), 0);
            bVal = groupB.reduce((sum, row) => sum + (toNum(row.currentPrice) - toNum(row.buyPrice)) * toNum(row.totalBuyAmount), 0);
            break;
        case 7: // 매수일자 - 가장 빠른 날짜
            aVal = groupA.reduce((earliest, row) => {
                const date = row.buyDate || '';
                return !earliest || date < earliest ? date : earliest;
            }, '');
            bVal = groupB.reduce((earliest, row) => {
                const date = row.buyDate || '';
                return !earliest || date < earliest ? date : earliest;
            }, '');
            break;
        default:
            return 0;
    }

    // 숫자 비교
    if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // 문자열 비교
    const comparison = String(aVal).localeCompare(String(bVal));
    return direction === 'asc' ? comparison : -comparison;
}

/**
 * 두 행의 값을 비교
 */
function compareValues(a, b, columnIndex, direction) {
    let aVal, bVal;

    switch (columnIndex) {
        case 0: // 종목
            aVal = String(a.symbol || '').toUpperCase();
            bVal = String(b.symbol || '').toUpperCase();
            break;
        case 1: // 매수가($)
            aVal = toNum(a.buyPrice);
            bVal = toNum(b.buyPrice);
            break;
        case 2: // 현재가($)
            aVal = toNum(a.currentPrice);
            bVal = toNum(b.currentPrice);
            break;
        case 3: // 수량
            aVal = toNum(a.totalBuyAmount);
            bVal = toNum(b.totalBuyAmount);
            break;
        case 4: // 매수금액($)
            aVal = toNum(a.buyPrice) * toNum(a.totalBuyAmount);
            bVal = toNum(b.buyPrice) * toNum(b.totalBuyAmount);
            break;
        case 5: // 평가금액($)
            aVal = toNum(a.currentPrice) * toNum(a.totalBuyAmount);
            bVal = toNum(b.currentPrice) * toNum(b.totalBuyAmount);
            break;
        case 6: // 손익
            aVal = (toNum(a.currentPrice) - toNum(a.buyPrice)) * toNum(a.totalBuyAmount);
            bVal = (toNum(b.currentPrice) - toNum(b.buyPrice)) * toNum(b.totalBuyAmount);
            break;
        case 7: // 매수일자
            aVal = a.buyDate || '';
            bVal = b.buyDate || '';
            break;
        default:
            return 0;
    }

    // 숫자 비교
    if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // 문자열 비교
    const comparison = String(aVal).localeCompare(String(bVal));
    return direction === 'asc' ? comparison : -comparison;
}
