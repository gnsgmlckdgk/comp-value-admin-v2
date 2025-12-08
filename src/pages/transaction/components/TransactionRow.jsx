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
    onRowDoubleClick,
}) {
    const isHit = toNum(row.targetPrice) > 0 && toNum(row.currentPrice) >= toNum(row.targetPrice);

    const handleCellDoubleClick = (e) => {
        // EditableTd에서 이미 처리되었으면 무시
        if (e.defaultPrevented) return;

        // 더블클릭 이벤트가 버튼에서 발생했으면 무시
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

        // 기업가치 조회 호출
        if (onRowDoubleClick && row.symbol) {
            onRowDoubleClick(row.symbol);
        }
    };

    return (
        <tr
            className={`group border-b ${row.__isGroupEnd ? 'border-b-0' : 'border-slate-300 dark:border-slate-700'} ${isHit ? 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30' : 'bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700/70'} cursor-pointer transition-all duration-150`}
            onDoubleClick={handleCellDoubleClick}
            title="더블클릭하여 기업가치 계산 결과 보기"
        >
            <Td className={`sticky left-0 z-10 dark:text-slate-50 transition-all duration-150`}>{index + 1}</Td>
            <EditableTd
                tdClassName={`sticky left-12 z-10 transition-all duration-150'}`}
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
            <KrwCell value={toNum(row.buyPrice) * (fx || 0)} />
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
            <CombinedPriceCell usdValue={toNum(row.totalBuyAmount) * toNum(row.buyPrice)} fx={fx} />
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
                <button
                    onClick={() => onRemove(row.id)}
                    className="px-2.5 py-1 rounded-md border text-xs hover:bg-rose-50 hover:border-rose-300 cursor-pointer disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:border-rose-700"
                    disabled={saving}
                >
                    삭제
                </button>
            </Td>
        </tr>
    );
}
