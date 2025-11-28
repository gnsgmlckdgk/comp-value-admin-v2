/**
 * 숫자 변환 유틸리티
 */
export const toNum = (v) => (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v));

/**
 * 숫자 포맷팅
 * @param {number} n - 포맷팅할 숫자
 * @param {number} d - 소수점 자릿수
 */
export function fmtNum(n, d = 2) {
    if (n == null || n === '' || isNaN(Number(n))) return '';
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
}

/**
 * USD 포맷팅 (소수점 2자리 고정)
 * @param {number} n - 포맷팅할 숫자
 */
export function fmtUsd(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '';
    return Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 * @param {Date|string} d - 포맷팅할 날짜
 */
export function fmtDate(d) {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
