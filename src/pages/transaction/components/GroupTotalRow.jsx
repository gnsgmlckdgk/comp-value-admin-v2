import { Td, UsdCell, KrwCell } from './TableCells';
import { toNum, fmtNum, fmtUsd } from '../utils/formatters';
import { TABLE_HEADERS } from '../constants';

/**
 * 그룹 합계 행
 */
export function GroupTotalRow({ data, fx }) {
    const { symbol, qtySum, buySumUSD, curSumUSD, diffUSD, curUSD, targetAvgUSD, hasNextGroupDivider } = data;

    return (
        <tr
            className={`bg-slate-50 font-semibold border-t-0 ${
                hasNextGroupDivider ? 'border-b-0' : 'border-b-2'
            } border-slate-400`}
        >
            <Td className="sticky left-0 z-10 bg-slate-50" />
            <Td className="sticky left-12 z-10 bg-slate-50 font-semibold text-slate-700">{symbol} 합계</Td>
            <Td />
            <Td />
            <Td />
            <Td />
            <Td>
                <div className="px-1 h-9 flex items-center">{qtySum ? fmtNum(qtySum, 0) : ''}</div>
            </Td>
            <UsdCell value={buySumUSD} />
            <KrwCell value={Math.round(buySumUSD * (fx || 0))} />
            <UsdCell value={curUSD} />
            <KrwCell value={Math.round(curUSD * (fx || 0))} />
            <UsdCell value={curSumUSD} />
            <KrwCell value={Math.round(curSumUSD * (fx || 0))} />
            <Td>
                <div className="px-1 leading-tight text-center">
                    <div>{targetAvgUSD ? `$ ${fmtUsd(targetAvgUSD)}` : ''}</div>
                    {(() => {
                        const cur = toNum(curUSD);
                        const tgt = toNum(targetAvgUSD);
                        if (!(cur || tgt)) return null;
                        const d = cur - tgt;
                        const pos = d >= 0;
                        const cls = pos ? 'text-rose-600' : 'text-blue-600';
                        return <div className={`${cls} text-[11px]`}>{`(${pos ? '+' : ''}$ ${fmtUsd(d)})`}</div>;
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
                    const pos = d >= 0;
                    const cls = pos ? 'text-rose-600' : 'text-blue-600';
                    const dKrw = fx ? Math.round(d * fx) : 0;
                    const pct = buyAvg > 0 ? (d / buyAvg) * 100 : 0;
                    return (
                        <div className="px-1 leading-tight text-center">
                            <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtUsd(d)}</div>
                            <div className="text-[11px] text-slate-500">{dKrw ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                            <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
                        </div>
                    );
                })()}
            </Td>
            {/* 총 가격차 */}
            <Td>
                {(() => {
                    const d = toNum(diffUSD);
                    const pos = d >= 0;
                    const cls = pos ? 'text-rose-600' : 'text-blue-600';
                    const dKrw = fx ? Math.round(d * fx) : 0;
                    const pct = toNum(buySumUSD) > 0 ? (d / toNum(buySumUSD)) * 100 : 0;
                    return (
                        <div className="px-1 leading-tight text-center">
                            <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtUsd(d)}</div>
                            <div className="text-[11px] text-slate-500">{dKrw ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                            <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
                        </div>
                    );
                })()}
            </Td>
            <Td />
            <Td />
        </tr>
    );
}
