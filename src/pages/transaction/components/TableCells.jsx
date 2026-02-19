import { toNum, fmtUsd } from '../utils/formatters';

/**
 * 금액 표시 – 정수부분 진하게, 소수부분 연하게
 */
export function FmtAmount({ text }) {
    if (!text) return null;
    const dotIdx = text.indexOf('.');
    if (dotIdx === -1) return text;
    return (
        <>
            {text.substring(0, dotIdx)}
            <span className="font-normal opacity-50">{text.substring(dotIdx)}</span>
        </>
    );
}

/**
 * 기본 테이블 셀 컴포넌트
 */
export function Td({ children, className = '' }) {
    return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

/**
 * KRW 표시 셀
 */
export function KrwCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="h-9 flex items-center justify-end text-slate-600 dark:text-slate-300 tabular-nums">
                {v ? `₩ ${Math.round(v).toLocaleString()}` : ''}
            </div>
        </Td>
    );
}

/**
 * USD 표시 셀
 */
export function UsdCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="h-9 flex items-center justify-end text-slate-700 dark:text-slate-200 font-medium tabular-nums">
                {v ? <FmtAmount text={`$ ${fmtUsd(v)}`} /> : ''}
            </div>
        </Td>
    );
}

/**
 * USD + KRW 통합 표시 셀
 */
export function CombinedPriceCell({ usdValue, fx, bold = false }) {
    const usd = toNum(usdValue);
    const krw = fx ? Math.round(usd * fx) : 0;

    return (
        <Td>
            <div className="leading-tight text-right">
                <div className={`text-slate-700 dark:text-slate-200 tabular-nums ${bold ? 'font-bold' : 'font-medium'}`}>
                    {usd ? <FmtAmount text={`$ ${fmtUsd(usd)}`} /> : ''}
                </div>
                {usd && fx ? (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                        {`₩ ${krw.toLocaleString()}`}
                    </div>
                ) : null}
            </div>
        </Td>
    );
}

/**
 * 가격 차이 표시 셀 (단일)
 */
export function DiffCell({ buy, cur, fx }) {
    const b = toNum(buy);
    const c = toNum(cur);
    const d = c - b; // per-share diff USD
    const dKrw = fx ? Math.round(d * fx) : 0;
    const pct = b > 0 ? (d / b) * 100 : 0;
    const pos = d >= 0;
    const cls = pos
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-blue-600 dark:text-blue-400';

    return (
        <Td>
            <div className="leading-tight text-center">
                <div className={`${cls} font-semibold tabular-nums`}>
                    <FmtAmount text={(pos ? '+' : '') + '$ ' + fmtUsd(d)} />
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {fx ? `₩ ${dKrw.toLocaleString()}` : ''}
                </div>
                <div className={`${cls} text-[12px] font-medium tabular-nums`}>
                    {(pos ? '+' : '') + pct.toFixed(2)}%
                </div>
            </div>
        </Td>
    );
}

/**
 * 총 가격 차이 표시 셀
 */
export function TotalDiffCell({ buy, cur, qty, fx }) {
    const b = toNum(buy);
    const c = toNum(cur);
    const q = toNum(qty);
    const buySum = b * q;
    const curSum = c * q;
    const d = curSum - buySum; // total diff USD
    const dKrw = fx ? Math.round(d * fx) : 0;
    const pct = buySum > 0 ? (d / buySum) * 100 : 0;
    const pos = d >= 0;
    const cls = pos
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-blue-600 dark:text-blue-400';

    return (
        <Td>
            <div className="leading-tight text-center">
                <div className={`${cls} font-semibold tabular-nums`}>
                    <FmtAmount text={(pos ? '+' : '') + '$ ' + fmtUsd(d)} />
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {fx ? `₩ ${dKrw.toLocaleString()}` : ''}
                </div>
                <div className={`${cls} text-[12px] font-medium tabular-nums`}>
                    {(pos ? '+' : '') + pct.toFixed(2)}%
                </div>
            </div>
        </Td>
    );
}

/**
 * 손익 셀 (총 손익 금액 + 수익률 2줄 표시)
 */
export function PnlCell({ buy, cur, qty, fx }) {
    const b = toNum(buy);
    const c = toNum(cur);
    const q = toNum(qty);
    const buyTotal = b * q;
    const curTotal = c * q;
    const diff = curTotal - buyTotal;
    const pct = buyTotal > 0 ? (diff / buyTotal) * 100 : 0;
    const pos = diff >= 0;
    const cls = pos
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-blue-600 dark:text-blue-400';
    const diffKrw = fx ? Math.round(diff * fx) : 0;

    return (
        <td className="px-3 py-2.5 align-middle">
            <div className="leading-tight text-right">
                <div className={`${cls} font-semibold tabular-nums`}>
                    <FmtAmount text={(pos ? '+' : '') + '$ ' + fmtUsd(diff)} />
                </div>
                {fx ? (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                        {(pos ? '+' : '') + '₩ ' + diffKrw.toLocaleString()}
                    </div>
                ) : null}
                <div className={`${cls} text-[12px] font-medium tabular-nums`}>
                    {(pos ? '+' : '') + pct.toFixed(2)}%
                </div>
            </div>
        </td>
    );
}
