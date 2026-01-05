import { useState, useMemo } from 'react';
import { TransactionHeader } from './components/TransactionHeader';
import { TransactionTableHeader } from './components/TransactionTableHeader';
import { TransactionRow } from './components/TransactionRow';
import { GroupTotalRow } from './components/GroupTotalRow';
import { TransactionSummary } from './components/TransactionSummary';
import { Td } from './components/TableCells';
import { useTransactions } from './hooks/useTransactions';
import { useFxRate } from './hooks/useFxRate';
import { useEditing } from './hooks/useEditing';
import { groupRowsBySymbol } from './utils/grouping';
import { calculateTotals, calculateDiffAndPercent } from './utils/calculations';
import { sortTransactionRows } from './utils/sorting';
import { COLUMN_WIDTHS, TABLE_HEADERS } from './constants';
import CompanyValueResultModal from '@/pages/trade/popup/CompanyValueResultModal';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import SellModal from './components/SellModal';
import TransactionModal from './components/TransactionModal';
import PageTitle from '@/component/common/display/PageTitle';
import { send, API_ENDPOINTS } from '@/util/ClientUtil';

export default function TransactionOverview() {
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', onConfirm: null });
    const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });

    const openAlert = (message, onConfirm) => {
        setAlertConfig({ open: true, message, onConfirm: onConfirm || null });
    };

    const handleCloseAlert = () => {
        const { onConfirm } = alertConfig;
        setAlertConfig({ open: false, message: '', onConfirm: null });
        if (onConfirm) onConfirm();
    };

    // confirm은 일단 기본 confirm 사용 (나중에 모달로 변경 가능)
    const openConfirm = (message) => confirm(message);

    const {
        rows,
        loading,
        saving,
        lastUpdated,
        addTransaction,
        updateTransactionField,
        removeTransaction,
        mergePricesBySymbols,
        processSell,
    } = useTransactions(openAlert, openConfirm);

    const { fxRate, refreshFxRate } = useFxRate();
    const { editing, setEditing, draft, setDraft, startEdit, cancelEdit } = useEditing();
    const [showCompValueModal, setShowCompValueModal] = useState(false);
    const [compValueData, setCompValueData] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sellModalData, setSellModalData] = useState({ open: false, data: null, targetRows: [] });
    const [transactionModalData, setTransactionModalData] = useState({ open: false, mode: 'add', data: null });

    // 편집 완료 핸들러
    const commitEdit = async () => {
        if (!editing) return;
        const { id, field } = editing;
        await updateTransactionField(id, field, draft);
        cancelEdit();
    };

    // 종목 추가 모달 열기
    const handleOpenAddModal = () => {
        setTransactionModalData({ open: true, mode: 'add', data: null });
    };

    // 종목 추가/수정 저장
    const handleSaveTransaction = async (formData) => {
        const success = await addTransaction(formData, mergePricesBySymbols);
        if (success) {
            setTransactionModalData({ open: false, mode: 'add', data: null });
            openAlert('종목이 등록되었습니다.');
        }
        return success;
    };

    // 현재가 갱신
    const handleRefreshPrices = async () => {
        setIsRefreshing(true);
        try {
            await mergePricesBySymbols(rows.map((r) => r.symbol));
            await refreshFxRate();
        } catch (e) {
            openAlert('현재가격/환율 갱신에 실패했습니다.');
        } finally {
            setIsRefreshing(false);
        }
    };

    // 기업가치 계산 조회
    const handleRowDoubleClick = async (symbol) => {
        if (!symbol || !symbol.trim()) {
            openAlert('티커 정보가 존재하지 않습니다.');
            return;
        }

        try {
            const url = API_ENDPOINTS.ABROAD_COMP_VALUE(symbol.trim());
            const { data, error } = await send(url, {}, 'GET');

            if (!error && data && data.response && Object.keys(data.response).length > 0) {
                setCompValueData(data.response);
                setShowCompValueModal(true);
            } else {
                openAlert('조회 결과가 존재하지 않거나 서버 응답을 받지 못했습니다.');
            }
        } catch (e) {
            openAlert('요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    // 정렬 핸들러
    const handleSort = (columnIndex) => {
        setSortConfig(prev => ({
            column: columnIndex,
            direction: prev.column === columnIndex && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // 매도 모달 열기 (단일 행)
    const handleOpenSellModalSingle = (row) => {
        setSellModalData({
            open: true,
            data: {
                symbol: row.symbol,
                companyName: row.companyName,
                buyPrice: row.buyPrice,
                totalQty: row.totalBuyAmount,
                currentPrice: row.currentPrice,
            },
            targetRows: [row],
        });
    };

    // 매도 모달 열기 (합계 행)
    const handleOpenSellModalGroup = (groupData) => {
        setSellModalData({
            open: true,
            data: {
                symbol: groupData.symbol,
                companyName: groupData.companyName,
                buyPrice: groupData.buyPrice,
                totalQty: groupData.totalQty,
                currentPrice: groupData.currentPrice,
            },
            targetRows: groupData.groupRows || [],
        });
    };

    // 매도 실행
    const handleConfirmSell = async (sellData) => {
        const result = await processSell(sellData, sellModalData.targetRows);
        if (result.success) {
            setSellModalData({ open: false, data: null, targetRows: [] });
            openAlert(`매도가 완료되었습니다.\n실현손익: $ ${result.realizedPnl?.toFixed(2) || 0}`);
        }
    };

    // 매도 모달 닫기
    const handleCloseSellModal = () => {
        setSellModalData({ open: false, data: null, targetRows: [] });
    };

    // 정렬된 행 목록
    const sortedRows = useMemo(() => {
        if (sortConfig.column === null) {
            return rows;
        }
        return sortTransactionRows(rows, sortConfig.column, sortConfig.direction);
    }, [rows, sortConfig]);

    // 그룹화된 행 목록
    const groupedRows = useMemo(() => groupRowsBySymbol(sortedRows), [sortedRows]);

    // 전체 합계 계산
    const totals = useMemo(() => calculateTotals(rows), [rows]);
    const { diff, diffPct } = useMemo(
        () => calculateDiffAndPercent(totals.buySum, totals.curSum),
        [totals.buySum, totals.curSum]
    );

    return (
        <>
            <PageTitle />

            <div className="mt-3 mb-4 px-2 md:px-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm dark:bg-blue-900/30 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-blue-900 font-medium mb-1 dark:text-blue-300">이 페이지는 순수 주가 변동만 계산합니다.</p>
                            <p className="text-blue-700 text-xs leading-relaxed dark:text-blue-400">
                                증권사 앱과 차이가 날 수 있는 이유: 현재가 갱신 시점 차이, 매매/환전 수수료 미반영, 증권사별 환율 차이
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-2 py-8 md:px-4">
                <TransactionHeader
                    loading={loading || isRefreshing}
                    rows={rows}
                    lastUpdated={lastUpdated}
                    fxRate={fxRate}
                    onRefresh={handleRefreshPrices}
                    onAddClick={handleOpenAddModal}
                />

                <div className="mx-0">
                    <div className="overflow-x-auto overflow-y-auto bg-white border border-slate-200 rounded-md scrollbar-always max-h-[70vh] dark:bg-slate-800 dark:border-slate-700">
                        <table className="table-fixed min-w-[1400px] w-full border-collapse">
                            <colgroup>
                                {COLUMN_WIDTHS.map((w, i) => (
                                    <col key={i} className={w} />
                                ))}
                            </colgroup>

                            <TransactionTableHeader sortConfig={sortConfig} onSort={handleSort} />

                            <tbody className="text-sm whitespace-nowrap">
                                {rows.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={TABLE_HEADERS.length} className="py-12 px-6 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-slate-400 dark:text-slate-500">
                                                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium text-slate-700 mb-2 dark:text-slate-300">등록된 종목이 없습니다</p>
                                                    <div className="text-sm text-slate-500 space-y-1 dark:text-slate-400">
                                                        <p>아래 신규 입력란에서 종목을 추가할 수 있습니다:</p>
                                                        <p className="text-xs">1. 티커(예: AAPL), 기업명, 매수일, 매수가, 수량 입력</p>
                                                        <p className="text-xs">2. <span className="font-semibold text-blue-600 dark:text-blue-400">추가</span> 버튼 클릭</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {(() => {
                                    let dataRowIndex = 0;
                                    return groupedRows.map((r, i) => {
                                        // 그룹 시작 구분선
                                        if (r.__type === 'groupStartDivider') {
                                            return (
                                                <tr key={`gs-${r.symbol}-${i}`}>
                                                    <td colSpan={TABLE_HEADERS.length} className="p-0">
                                                        <div className="h-2 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        // 그룹 합계 행
                                        if (r.__type === 'groupTotal') {
                                            return (
                                                <GroupTotalRow
                                                    key={`g-${r.symbol}-${i}`}
                                                    data={r}
                                                    fx={fxRate}
                                                    onSell={handleOpenSellModalGroup}
                                                    saving={saving}
                                                />
                                            );
                                        }

                                        // 일반 데이터 행 - 단일 행인지 확인 (그룹에 속하지 않은 경우)
                                        const isSingleRow = !r.__groupKey;
                                        const currentIndex = dataRowIndex;
                                        dataRowIndex++;
                                        return (
                                            <TransactionRow
                                                key={r.id}
                                                row={r}
                                                index={currentIndex}
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
                                                onSell={handleOpenSellModalSingle}
                                                isSingleRow={isSingleRow}
                                            />
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

                <TransactionSummary
                    buySum={totals.buySum}
                    curSum={totals.curSum}
                    diff={diff}
                    diffPct={diffPct}
                    fx={fxRate}
                />

                {loading && <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">불러오는 중…</div>}
                {saving && <div className="mt-3 text-sm text-blue-600 font-medium dark:text-blue-400">저장 중...</div>}
            </div>

            <CompanyValueResultModal
                isOpen={showCompValueModal}
                onClose={() => setShowCompValueModal(false)}
                data={compValueData}
            />

            <AlertModal
                open={alertConfig.open}
                message={alertConfig.message}
                onClose={handleCloseAlert}
            />

            <SellModal
                open={sellModalData.open}
                onClose={handleCloseSellModal}
                onConfirm={handleConfirmSell}
                data={sellModalData.data}
                fx={fxRate}
                saving={saving}
            />

            <TransactionModal
                isOpen={transactionModalData.open}
                mode={transactionModalData.mode}
                data={transactionModalData.data}
                onClose={() => setTransactionModalData({ open: false, mode: 'add', data: null })}
                onSave={handleSaveTransaction}
            />
        </>
    );
}
