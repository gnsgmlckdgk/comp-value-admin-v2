import { useState, useMemo } from 'react';
import { TransactionHeader } from './components/TransactionHeader';
import { TransactionTableHeader } from './components/TransactionTableHeader';
import { TransactionRow } from './components/TransactionRow';
import { GroupTotalRow } from './components/GroupTotalRow';
import { NewTransactionRow } from './components/NewTransactionRow';
import { TransactionSummary } from './components/TransactionSummary';
import { Td } from './components/TableCells';
import { useTransactions } from './hooks/useTransactions';
import { useFxRate } from './hooks/useFxRate';
import { useEditing } from './hooks/useEditing';
import { groupRowsBySymbol } from './utils/grouping';
import { calculateTotals, calculateDiffAndPercent } from './utils/calculations';
import { COLUMN_WIDTHS, INITIAL_NEW_ROW, TABLE_HEADERS } from './constants';
import CompanyValueResultModal from '@/pages/trade/popup/CompanyValueResultModal';
import { send } from '@/util/ClientUtil';

export default function TransactionOverview() {
    const {
        rows,
        loading,
        saving,
        lastUpdated,
        addTransaction,
        updateTransactionField,
        removeTransaction,
        mergePricesBySymbols,
    } = useTransactions();

    const { fxRate, refreshFxRate } = useFxRate();
    const { editing, setEditing, draft, setDraft, startEdit, cancelEdit } = useEditing();
    const [newRow, setNewRow] = useState(INITIAL_NEW_ROW);
    const [showCompValueModal, setShowCompValueModal] = useState(false);
    const [compValueData, setCompValueData] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 편집 완료 핸들러
    const commitEdit = async () => {
        if (!editing) return;
        const { id, field } = editing;
        await updateTransactionField(id, field, draft);
        cancelEdit();
    };

    // 신규 행 추가
    const handleAddRow = async () => {
        const success = await addTransaction(newRow, mergePricesBySymbols);
        if (success) {
            setNewRow(INITIAL_NEW_ROW);
        }
    };

    // 현재가 갱신
    const handleRefreshPrices = async () => {
        setIsRefreshing(true);
        try {
            await mergePricesBySymbols(rows.map((r) => r.symbol));
            await refreshFxRate();
        } catch (e) {
            alert('현재가격/환율 갱신에 실패했습니다.');
        } finally {
            setIsRefreshing(false);
        }
    };

    // 기업가치 계산 조회
    const handleRowDoubleClick = async (symbol) => {
        if (!symbol || !symbol.trim()) {
            alert('티커 정보가 존재하지 않습니다.');
            return;
        }

        try {
            const url = `/dart/main/cal/per_value/abroad/v2?symbol=${encodeURIComponent(symbol.trim())}`;
            const { data, error } = await send(url, {}, 'GET');

            if (!error && data && data.response && Object.keys(data.response).length > 0) {
                setCompValueData(data.response);
                setShowCompValueModal(true);
            } else {
                alert('조회 결과가 존재하지 않거나 서버 응답을 받지 못했습니다.');
            }
        } catch (e) {
            alert('요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    // 그룹화된 행 목록
    const groupedRows = useMemo(() => groupRowsBySymbol(rows), [rows]);

    // 전체 합계 계산
    const totals = useMemo(() => calculateTotals(rows), [rows]);
    const { diff, diffPct } = useMemo(
        () => calculateDiffAndPercent(totals.buySum, totals.curSum),
        [totals.buySum, totals.curSum]
    );

    return (
        <>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">보유 종목 관리</h1>

            <div className="px-2 py-8 md:px-4">
                <TransactionHeader
                    loading={loading || isRefreshing}
                    rows={rows}
                    lastUpdated={lastUpdated}
                    fxRate={fxRate}
                    onRefresh={handleRefreshPrices}
                />

                <div className="mx-0">
                    <div className="overflow-x-auto overflow-y-auto bg-white border border-slate-200 rounded-md scrollbar-always max-h-[70vh]">
                        <table className="table-fixed min-w-[1880px] w-full border-collapse">
                            <colgroup>
                                {COLUMN_WIDTHS.map((w, i) => (
                                    <col key={i} className={w} />
                                ))}
                            </colgroup>

                            <TransactionTableHeader />

                            <tbody className="text-sm whitespace-nowrap">
                                {groupedRows.map((r, i) => {
                                    // 그룹 시작 구분선
                                    if (r.__type === 'groupStartDivider') {
                                        return (
                                            <tr key={`gs-${r.symbol}-${i}`}>
                                                <td colSpan={TABLE_HEADERS.length} className="p-0">
                                                    <div className="h-2 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // 그룹 합계 행
                                    if (r.__type === 'groupTotal') {
                                        return <GroupTotalRow key={`g-${r.symbol}-${i}`} data={r} fx={fxRate} />;
                                    }

                                    // 일반 데이터 행
                                    return (
                                        <TransactionRow
                                            key={r.id}
                                            row={r}
                                            index={i}
                                            fx={fxRate}
                                            editing={editing}
                                            setEditing={setEditing}
                                            draft={draft}
                                            setDraft={setDraft}
                                            startEdit={startEdit}
                                            commitEdit={commitEdit}
                                            onRemove={removeTransaction}
                                            saving={saving}
                                            onRowDoubleClick={handleRowDoubleClick}
                                        />
                                    );
                                })}

                                <NewTransactionRow
                                    newRow={newRow}
                                    setNewRow={setNewRow}
                                    onAdd={handleAddRow}
                                    saving={saving}
                                />
                            </tbody>
                        </table>

                        <TransactionSummary
                            buySum={totals.buySum}
                            curSum={totals.curSum}
                            diff={diff}
                            diffPct={diffPct}
                            fx={fxRate}
                        />
                    </div>
                </div>

                {loading && <div className="mt-3 text-sm text-slate-500">불러오는 중…</div>}
                {saving && <div className="mt-3 text-sm text-blue-600 font-medium">저장 중...</div>}
            </div>

            <CompanyValueResultModal
                isOpen={showCompValueModal}
                onClose={() => setShowCompValueModal(false)}
                data={compValueData}
            />
        </>
    );
}
