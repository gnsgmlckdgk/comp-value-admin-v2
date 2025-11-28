import { fmtUsd } from '../utils/formatters';

/**
 * 거래 합계 요약
 */
export function TransactionSummary({ buySum, curSum, diff, diffPct, fx }) {
    return (
        <div className="p-3 border-t border-slate-200 text-sm flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-slate-600">
                    총매수금액: <b>$ {fmtUsd(buySum)}</b>
                    {fx ? ` (≈ ₩${Math.round(buySum * fx).toLocaleString()})` : ''}
                </span>
                <span className="text-slate-600">
                    총현재가치: <b>$ {fmtUsd(curSum)}</b>
                    {fx ? ` (≈ ₩${Math.round(curSum * fx).toLocaleString()})` : ''}
                </span>
            </div>
            <div className="mt-1 md:mt-0">
                <span className={diff >= 0 ? 'text-rose-600 font-semibold' : 'text-blue-600 font-semibold'}>
                    $ {diff >= 0 ? '+' : ''}{fmtUsd(diff)}
                    {fx ? `  (≈ ₩${Math.round(diff * fx).toLocaleString()})` : ''}
                    {`  ( ${diff >= 0 ? '+' : ''}${diffPct.toFixed(2)}% )`}
                </span>
            </div>
        </div>
    );
}
