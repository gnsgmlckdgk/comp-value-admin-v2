import { Td, CombinedPriceCell } from './TableCells';
import { toNum, fmtNum, fmtUsd } from '../utils/formatters';

/**
 * 그룹 합계 행
 */
export function GroupTotalRow({ data, fx, onSell, saving, onRowClick }) {
    const { symbol, qtySum, buySumUSD, curSumUSD, diffUSD, curUSD, buyAvgUSD, targetAvgUSD, buyExchangeRateAtTrade, hasNextGroupDivider, companyName, groupRows } = data;

    // 행 더블클릭 핸들러
    const handleRowDoubleClick = (e) => {
        // 버튼 클릭은 무시
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

        // 상세정보 모달 열기
        if (onRowClick) {
            onRowClick({
                symbol,
                companyName,
                buyPrice: buyAvgUSD,
                totalQty: qtySum,
                currentPrice: curUSD,
                targetPrice: targetAvgUSD,
                buyExchangeRateAtTrade: buyExchangeRateAtTrade,
                __type: 'groupTotal',
            });
        }
    };

    // 가격차 렌더링 헬퍼
    const renderDiff = (d, baseValue) => {
        const pos = d >= 0;
        const cls = pos
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-blue-600 dark:text-blue-400';
        const dKrw = fx ? Math.round(d * fx) : 0;
        const pct = baseValue > 0 ? (d / baseValue) * 100 : 0;

        return (
            <div className="leading-tight text-center">
                <div className={`${cls} font-bold`}>
                    {(pos ? '+' : '') + '$ ' + fmtUsd(d)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {dKrw ? `₩ ${dKrw.toLocaleString()}` : ''}
                </div>
                <div className={`${cls} text-[12px] font-semibold`}>
                    {(pos ? '+' : '') + pct.toFixed(2)}%
                </div>
            </div>
        );
    };

    return (
        <tr
            className={`
                font-semibold border-t-0 transition-colors cursor-pointer
                ${hasNextGroupDivider ? 'border-b-0' : 'border-b-2 border-slate-300 dark:border-slate-600'}
                bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50
                hover:from-indigo-100 hover:via-slate-100 hover:to-indigo-100
                dark:from-indigo-900/20 dark:via-slate-800 dark:to-indigo-900/20
                dark:hover:from-indigo-900/30 dark:hover:via-slate-700 dark:hover:to-indigo-900/30
            `}
            onDoubleClick={handleRowDoubleClick}
            title="더블클릭하여 상세정보 보기"
        >
            {/* No */}
            <Td className="sticky left-0 z-10 bg-indigo-50 dark:bg-slate-800" />

            {/* 티커 합계 */}
            <Td className="sticky left-12 z-10 bg-indigo-50 dark:bg-slate-800">
                <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-800/50">
                        <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{symbol}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">합계</span>
                </div>
            </Td>

            {/* 기업명 */}
            <Td />

            {/* 매수일자 */}
            <Td />

            {/* 평균 매수가격 */}
            <Td>
                <div className="h-9 flex items-center text-slate-700 dark:text-slate-200">
                    {buyAvgUSD ? `$ ${fmtUsd(buyAvgUSD)}` : ''}
                </div>
            </Td>

            {/* 평균 매수가격 (원화) */}
            <Td>
                <div className="h-9 flex items-center justify-end text-slate-600 dark:text-slate-300">
                    {buyAvgUSD && (buyExchangeRateAtTrade || fx) ? `₩ ${Math.round(buyAvgUSD * (buyExchangeRateAtTrade || fx)).toLocaleString()}` : ''}
                </div>
            </Td>

            {/* 매수당시환율 평균 */}
            <Td className="text-center text-slate-700 dark:text-slate-300 text-sm">
                {buyExchangeRateAtTrade ? `₩${buyExchangeRateAtTrade.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}` : '-'}
            </Td>

            {/* 수량 합계 */}
            <Td>
                <div className="h-9 flex items-center font-bold text-slate-800 dark:text-slate-100">
                    {qtySum ? fmtNum(qtySum, 0) : ''}
                </div>
            </Td>

            {/* 총매수금액 */}
            <CombinedPriceCell usdValue={buySumUSD} fx={buyExchangeRateAtTrade || fx} bold />

            {/* 총현재가치 */}
            <CombinedPriceCell usdValue={curSumUSD} fx={fx} bold />

            {/* 현재가격 */}
            <CombinedPriceCell usdValue={curUSD} fx={fx} />

            {/* 매도목표가 (평균) */}
            <Td>
                <div className="leading-tight text-center">
                    <div className="text-slate-700 dark:text-slate-200">
                        {targetAvgUSD ? `$ ${fmtUsd(targetAvgUSD)}` : ''}
                    </div>
                    {(() => {
                        const cur = toNum(curUSD);
                        const tgt = toNum(targetAvgUSD);
                        if (!(cur || tgt)) return null;
                        const d = cur - tgt;
                        const pos = d >= 0;
                        const cls = pos
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-blue-600 dark:text-blue-400';
                        return (
                            <div className={`${cls} text-[11px]`}>
                                {`(${pos ? '+' : ''}$ ${fmtUsd(d)})`}
                            </div>
                        );
                    })()}
                </div>
            </Td>

            {/* 단일가격차 */}
            <Td>
                {(() => {
                    const qty = toNum(qtySum);
                    const cur = toNum(curUSD);
                    const buyAvg = qty > 0 ? toNum(buySumUSD) / qty : 0;
                    const d = cur - buyAvg;
                    if (!(cur || buyAvg)) return null;
                    return renderDiff(d, buyAvg);
                })()}
            </Td>

            {/* 총 가격차 */}
            <Td>
                {(() => {
                    const d = toNum(diffUSD);
                    return renderDiff(d, toNum(buySumUSD));
                })()}
            </Td>

            {/* 비고 */}
            <Td />

            {/* 작업 */}
            <Td>
                {onSell && (
                    <div className="flex justify-center">
                        <button
                            onClick={() => onSell({
                                symbol,
                                companyName,
                                buyPrice: buyAvgUSD,
                                totalQty: qtySum,
                                currentPrice: curUSD,
                                buyExchangeRateAtTrade: buyExchangeRateAtTrade,
                                groupRows,
                            })}
                            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all
                                bg-blue-100 text-blue-700 border border-blue-200
                                hover:bg-blue-200 hover:border-blue-300
                                dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700
                                dark:hover:bg-blue-900/60 dark:hover:border-blue-600
                                disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                        >
                            매도
                        </button>
                    </div>
                )}
            </Td>
        </tr>
    );
}
