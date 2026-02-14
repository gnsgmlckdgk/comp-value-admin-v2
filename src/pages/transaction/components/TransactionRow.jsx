import { Td, PnlCell } from './TableCells';
import { toNum, fmtUsd, fmtDate } from '../utils/formatters';

/**
 * 거래 데이터 행 (8컬럼, 읽기전용)
 */
export function TransactionRow({ row, index, fx, onRowClick }) {
    const isHit = toNum(row.targetPrice) > 0 && toNum(row.currentPrice) >= toNum(row.targetPrice);
    const isEven = index % 2 === 0;

    const getRowBg = () => {
        if (isHit) {
            return 'bg-amber-300 hover:bg-amber-200 dark:bg-[#3b2f1a] dark:hover:bg-[#4b3d24]';
        }
        if (isEven) {
            return 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750';
        }
        return 'bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-800/50 dark:hover:bg-slate-750';
    };

    const getStickyBg = () => {
        if (isHit) {
            return 'bg-amber-300 group-hover:bg-amber-200 dark:bg-[#3b2f1a] dark:group-hover:bg-[#4b3d24]';
        }
        if (isEven) {
            return 'bg-white group-hover:bg-slate-50 dark:bg-slate-800 dark:group-hover:bg-slate-700';
        }
        return 'bg-slate-50 group-hover:bg-slate-100 dark:bg-slate-800 dark:group-hover:bg-slate-700';
    };

    const buyPrice = toNum(row.buyPrice);
    const curPrice = toNum(row.currentPrice);
    const qty = toNum(row.totalBuyAmount);
    const targetPrice = toNum(row.targetPrice);
    const hasTarget = targetPrice > 0 && buyPrice > 0 && targetPrice > buyPrice;
    const progress = hasTarget
        ? Math.max(0, ((curPrice - buyPrice) / (targetPrice - buyPrice)) * 100)
        : 0;

    return (
        <tr
            onClick={() => onRowClick && onRowClick(row)}
            className={`
                group border-b transition-colors duration-100 cursor-pointer
                ${row.__isGroupEnd ? 'border-b-0' : 'border-slate-200 dark:border-slate-700'}
                ${getRowBg()}
            `}
            title="클릭하여 상세정보 보기"
        >
            {/* 종목: ticker(bold) + company(subtitle) */}
            <Td className={`sticky left-0 z-10 ${getStickyBg()}`}>
                <div className="leading-tight">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{row.symbol}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                        {row.companyName}
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

            {/* 매수가($) */}
            <Td>
                <div className="leading-tight text-right">
                    <div className="text-slate-700 dark:text-slate-200 tabular-nums">
                        {buyPrice ? `$ ${fmtUsd(buyPrice)}` : ''}
                    </div>
                    {buyPrice && fx ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ₩ {Math.round(buyPrice * fx).toLocaleString()}
                        </div>
                    ) : null}
                </div>
            </Td>

            {/* 현재가($) */}
            <Td>
                <div className="leading-tight text-right">
                    <div className="text-slate-700 dark:text-slate-200 tabular-nums">
                        {curPrice ? `$ ${fmtUsd(curPrice)}` : ''}
                    </div>
                    {curPrice && fx ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ₩ {Math.round(curPrice * fx).toLocaleString()}
                        </div>
                    ) : null}
                </div>
            </Td>

            {/* 수량 */}
            <Td>
                <div className="h-9 flex items-center justify-end text-slate-700 dark:text-slate-200 tabular-nums">
                    {qty || ''}
                </div>
            </Td>

            {/* 매수금액($) = buyPrice * qty */}
            <Td>
                <div className="leading-tight text-right">
                    <div className="text-slate-700 dark:text-slate-200 tabular-nums font-medium">
                        {buyPrice && qty ? `$ ${fmtUsd(buyPrice * qty)}` : ''}
                    </div>
                    {buyPrice && qty && fx ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ₩ {Math.round(buyPrice * qty * fx).toLocaleString()}
                        </div>
                    ) : null}
                </div>
            </Td>

            {/* 평가금액($) = currentPrice * qty */}
            <Td>
                <div className="leading-tight text-right">
                    <div className="text-slate-700 dark:text-slate-200 tabular-nums font-medium">
                        {curPrice && qty ? `$ ${fmtUsd(curPrice * qty)}` : ''}
                    </div>
                    {curPrice && qty && fx ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ₩ {Math.round(curPrice * qty * fx).toLocaleString()}
                        </div>
                    ) : null}
                </div>
            </Td>

            {/* 손익 */}
            <PnlCell buy={buyPrice} cur={curPrice} qty={qty} fx={fx} />

            {/* 매수일자 */}
            <Td>
                <div className="h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 text-sm">
                    {fmtDate(row.buyDate)}
                </div>
            </Td>
        </tr>
    );
}
