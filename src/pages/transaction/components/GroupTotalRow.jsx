import { Td } from './TableCells';
import { fmtNum, fmtUsd } from '../utils/formatters';

/**
 * 그룹 합계 행 (8컬럼)
 */
export function GroupTotalRow({ data, fx, onRowClick }) {
    const { symbol, qtySum, buySumUSD, curSumUSD, diffUSD, curUSD, buyAvgUSD, buyExchangeRateAtTrade, hasNextGroupDivider, companyName, groupRows, targetAvgUSD } = data;

    const hasTarget = targetAvgUSD > 0 && buyAvgUSD > 0 && targetAvgUSD > buyAvgUSD;
    const progress = hasTarget
        ? Math.max(0, ((curUSD - buyAvgUSD) / (targetAvgUSD - buyAvgUSD)) * 100)
        : 0;

    const handleRowClick = () => {
        if (onRowClick) {
            onRowClick({
                symbol,
                companyName,
                buyPrice: buyAvgUSD,
                totalQty: qtySum,
                currentPrice: curUSD,
                targetPrice: data.targetAvgUSD,
                buyExchangeRateAtTrade: buyExchangeRateAtTrade,
                __type: 'groupTotal',
                groupRows,
            });
        }
    };

    const pct = buySumUSD > 0 ? (diffUSD / buySumUSD) * 100 : 0;
    const pos = diffUSD >= 0;
    const pnlCls = pos
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-blue-600 dark:text-blue-400';

    return (
        <tr
            className={`
                group font-semibold border-t-0 transition-colors cursor-pointer
                ${hasNextGroupDivider ? 'border-b-0' : 'border-b-2 border-slate-300 dark:border-slate-600'}
                bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50
                hover:from-indigo-100 hover:via-slate-100 hover:to-indigo-100
                dark:bg-none dark:bg-[#222a49] dark:hover:bg-[#2b3355]
            `}
            onClick={handleRowClick}
            title="클릭하여 상세정보 보기"
        >
            {/* 종목 */}
            <Td className="sticky left-0 z-10 bg-indigo-50 group-hover:bg-indigo-100 dark:bg-[#222a49] dark:group-hover:bg-[#2b3355]">
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-800/50">
                            <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{symbol}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">합계</span>
                    </div>
                    {hasTarget && (
                        <div className="mt-1 flex items-center gap-1.5">
                            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        progress >= 100
                                            ? 'bg-amber-400 dark:bg-amber-400'
                                            : progress >= 75
                                                ? 'bg-yellow-400 dark:bg-yellow-400'
                                                : progress >= 40
                                                    ? 'bg-emerald-400 dark:bg-emerald-400'
                                                    : 'bg-sky-400 dark:bg-sky-400'
                                    }`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                            </div>
                            <span className={`text-[10px] font-semibold tabular-nums whitespace-nowrap ${
                                progress >= 100
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}>
                                {Math.round(progress)}%
                            </span>
                        </div>
                    )}
                </div>
            </Td>

            {/* 평균 매수가($) */}
            <Td>
                <div className="leading-tight text-right">
                    <div className="text-slate-700 dark:text-slate-200 tabular-nums">
                        {buyAvgUSD ? `$ ${fmtUsd(buyAvgUSD)}` : ''}
                    </div>
                    {buyAvgUSD && fx ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ₩ {Math.round(buyAvgUSD * fx).toLocaleString()}
                        </div>
                    ) : null}
                </div>
            </Td>

            {/* 현재가($) */}
            <Td>
                <div className="leading-tight text-right">
                    <div className="text-slate-700 dark:text-slate-200 tabular-nums">
                        {curUSD ? `$ ${fmtUsd(curUSD)}` : ''}
                    </div>
                    {curUSD && fx ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ₩ {Math.round(curUSD * fx).toLocaleString()}
                        </div>
                    ) : null}
                </div>
            </Td>

            {/* 수량 합계 */}
            <Td>
                <div className="h-9 flex items-center justify-end font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {qtySum ? fmtNum(qtySum, 0) : ''}
                </div>
            </Td>

            {/* 총매수금액($) */}
            <Td>
                <div className="leading-tight text-right">
                    <div className="text-slate-700 dark:text-slate-200 tabular-nums font-bold">
                        {buySumUSD ? `$ ${fmtUsd(buySumUSD)}` : ''}
                    </div>
                    {buySumUSD && fx ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ₩ {Math.round(buySumUSD * fx).toLocaleString()}
                        </div>
                    ) : null}
                </div>
            </Td>

            {/* 총평가금액($) */}
            <Td>
                <div className="leading-tight text-right">
                    <div className="text-slate-700 dark:text-slate-200 tabular-nums font-bold">
                        {curSumUSD ? `$ ${fmtUsd(curSumUSD)}` : ''}
                    </div>
                    {curSumUSD && fx ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ₩ {Math.round(curSumUSD * fx).toLocaleString()}
                        </div>
                    ) : null}
                </div>
            </Td>

            {/* 손익 */}
            <td className="px-3 py-2.5 align-middle">
                <div className="leading-tight text-right">
                    <div className={`${pnlCls} font-bold tabular-nums`}>
                        {(pos ? '+' : '') + '$ ' + fmtUsd(diffUSD)}
                    </div>
                    {fx ? (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {(pos ? '+' : '') + '₩ ' + Math.round(diffUSD * fx).toLocaleString()}
                        </div>
                    ) : null}
                    <div className={`${pnlCls} text-[12px] font-semibold tabular-nums`}>
                        {(pos ? '+' : '') + pct.toFixed(2)}%
                    </div>
                </div>
            </td>

            {/* 매수일자 (비워둠) */}
            <Td />
        </tr>
    );
}
