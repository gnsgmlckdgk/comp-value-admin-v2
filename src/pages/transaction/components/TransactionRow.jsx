import { Td, EditableTd, UsdCell, KrwCell, CombinedPriceCell, DiffCell, TotalDiffCell } from './TableCells';
import { toNum } from '../utils/formatters';

/**
 * 거래 데이터 행
 */
export function TransactionRow({
    row,
    index,
    fx,
    editing,
    setEditing,
    draft,
    setDraft,
    startEdit,
    commitEdit,
    onRemove,
    saving,
    onRowClick,
    onSell,
    isSingleRow = false,
}) {
    const isHit = toNum(row.targetPrice) > 0 && toNum(row.currentPrice) >= toNum(row.targetPrice);
    const isEven = index % 2 === 0;

    const handleRowDoubleClick = (e) => {
        // EditableTd에서 이미 처리되었으면 무시 (인라인 편집)
        if (e.defaultPrevented) return;

        // 편집 중이면 무시
        if (editing) return;

        // 더블클릭 이벤트가 버튼에서 발생했으면 무시
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

        // 인라인 편집 셀의 input에서 발생했으면 무시
        if (e.target.tagName === 'INPUT' || e.target.closest('input')) return;

        // 상세정보 모달 열기
        if (onRowClick) {
            onRowClick(row);
        }
    };

    // 행 배경색 결정
    const getRowBg = () => {
        if (isHit) {
            return 'bg-amber-300 hover:bg-amber-200 dark:bg-amber-900/20 dark:hover:bg-amber-900/30';
        }
        if (isEven) {
            return 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750';
        }
        return 'bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-800/50 dark:hover:bg-slate-750';
    };

    // sticky 셀 배경색 (행 배경과 동기화 - 불투명)
    const getStickyBg = () => {
        if (isHit) {
            return 'bg-amber-300 group-hover:bg-amber-200 dark:bg-amber-950 dark:group-hover:bg-amber-900';
        }
        if (isEven) {
            return 'bg-white group-hover:bg-slate-50 dark:bg-slate-800 dark:group-hover:bg-slate-700';
        }
        return 'bg-slate-50 group-hover:bg-slate-100 dark:bg-slate-800 dark:group-hover:bg-slate-700';
    };

    return (
        <tr
            className={`
                group border-b transition-colors duration-100 cursor-pointer
                ${row.__isGroupEnd ? 'border-b-0' : 'border-slate-200 dark:border-slate-700'}
                ${getRowBg()}
            `}
            onDoubleClick={handleRowDoubleClick}
            title="더블클릭하여 상세정보 보기"
        >
            <Td className={`sticky left-0 z-10 ${getStickyBg()} text-slate-500 dark:text-slate-400 text-center font-medium`}>
                {index + 1}
            </Td>
            <EditableTd
                tdClassName={`sticky left-12 z-10 ${getStickyBg()}`}
                row={row}
                field="symbol"
                value={row.symbol}
                startEdit={startEdit}
                editing={editing}
                setEditing={setEditing}
                draft={draft}
                setDraft={setDraft}
                commitEdit={commitEdit}
            />
            <EditableTd
                row={row}
                field="companyName"
                value={row.companyName}
                startEdit={startEdit}
                editing={editing}
                setEditing={setEditing}
                draft={draft}
                setDraft={setDraft}
                commitEdit={commitEdit}
            />
            <EditableTd
                row={row}
                field="buyDate"
                value={row.buyDate}
                startEdit={startEdit}
                editing={editing}
                setEditing={setEditing}
                draft={draft}
                setDraft={setDraft}
                commitEdit={commitEdit}
                type="date"
            />
            <EditableTd
                row={row}
                field="buyPrice"
                value={row.buyPrice}
                startEdit={startEdit}
                editing={editing}
                setEditing={setEditing}
                draft={draft}
                setDraft={setDraft}
                commitEdit={commitEdit}
                type="number"
            />
            <KrwCell value={toNum(row.buyPrice) * (toNum(row.buyExchangeRateAtTrade) || fx || 0)} />
            <EditableTd
                row={row}
                field="buyExchangeRateAtTrade"
                value={row.buyExchangeRateAtTrade}
                startEdit={startEdit}
                editing={editing}
                setEditing={setEditing}
                draft={draft}
                setDraft={setDraft}
                commitEdit={commitEdit}
                type="number"
            />
            <EditableTd
                row={row}
                field="totalBuyAmount"
                value={row.totalBuyAmount}
                startEdit={startEdit}
                editing={editing}
                setEditing={setEditing}
                draft={draft}
                setDraft={setDraft}
                commitEdit={commitEdit}
                type="number"
            />
            <CombinedPriceCell usdValue={toNum(row.totalBuyAmount) * toNum(row.buyPrice)} fx={toNum(row.buyExchangeRateAtTrade) || fx} />
            <CombinedPriceCell usdValue={toNum(row.currentPrice) * toNum(row.totalBuyAmount)} fx={fx} />
            <CombinedPriceCell usdValue={toNum(row.currentPrice)} fx={fx} />
            <EditableTd
                row={row}
                field="targetPrice"
                value={row.targetPrice}
                startEdit={startEdit}
                editing={editing}
                setEditing={setEditing}
                draft={draft}
                setDraft={setDraft}
                commitEdit={commitEdit}
                type="number"
            />
            <DiffCell buy={toNum(row.buyPrice)} cur={toNum(row.currentPrice)} fx={fx} />
            <TotalDiffCell buy={toNum(row.buyPrice)} cur={toNum(row.currentPrice)} qty={toNum(row.totalBuyAmount)} fx={fx} />
            <EditableTd
                row={row}
                field="rmk"
                value={row.rmk}
                startEdit={startEdit}
                editing={editing}
                setEditing={setEditing}
                draft={draft}
                setDraft={setDraft}
                commitEdit={commitEdit}
            />
            <Td>
                <div className="flex gap-1.5 justify-center">
                    {isSingleRow && onSell && (
                        <button
                            onClick={() => onSell(row)}
                            className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                                bg-blue-50 text-blue-600 border border-blue-200
                                hover:bg-blue-100 hover:border-blue-300
                                dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800
                                dark:hover:bg-blue-900/50 dark:hover:border-blue-700
                                disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                        >
                            매도
                        </button>
                    )}
                    <button
                        onClick={() => onRemove(row.id)}
                        className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                            bg-slate-50 text-slate-600 border border-slate-200
                            hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300
                            dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600
                            dark:hover:bg-rose-900/30 dark:hover:text-rose-400 dark:hover:border-rose-800
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving}
                    >
                        삭제
                    </button>
                </div>
            </Td>
        </tr>
    );
}
