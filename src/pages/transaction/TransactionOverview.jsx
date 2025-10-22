import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refreshCurrentPrices,
} from '@/pages/transaction/services/TransactionService'

function fmtNum(n, d = 2) {
    if (n == null || n === '' || isNaN(Number(n))) return '';
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
}

function fmtDate(d) {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function TransactionOverview() {
    const { isLoggedIn } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null); // { id, field }
    const [draft, setDraft] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    // 신규 등록용 입력값
    const [newRow, setNewRow] = useState({
        symbol: '',
        companyName: '',
        buyPrice: '',
        totalBuyAmount: '',
        buyDate: '',
        currentPrice: '',
        targetPrice: '',
    });

    // 최초 로드 시 목록 조회
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const list = await fetchTransactions();
                setRows(list);
                setLastUpdated(new Date());
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const startEdit = (row, field) => {
        setEditing({ id: row.id, field });
        setDraft(row[field] ?? '');
    };

    const commitEdit = async () => {
        if (!editing) return;
        const { id, field } = editing;
        const value = draft;
        setSaving(true);
        try {
            const updated = await updateTransaction(id, { [field]: value });
            setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
        } catch (e) {
            alert('수정에 실패했습니다.');
        } finally {
            setSaving(false);
            setEditing(null);
            setDraft('');
        }
    };

    const removeRow = async (id) => {
        if (!confirm('삭제하시겠어요?')) return;
        setSaving(true);
        try {
            await deleteTransaction(id);
            const list = await fetchTransactions();
            setRows(list);
            setLastUpdated(new Date());
        } catch (e) {
            alert('삭제에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const addRow = async () => {
        const payload = { ...newRow };
        if (!payload.symbol) return alert('티커를 입력해주세요.');
        setSaving(true);
        try {
            await createTransaction(payload);
            const list = await fetchTransactions();
            setRows(list);
            setNewRow({ symbol: '', companyName: '', buyPrice: '', totalBuyAmount: '', buyDate: '', currentPrice: '', targetPrice: '' });
            setLastUpdated(new Date());
        } catch (e) {
            alert('등록에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const refreshPrices = async () => {
        setLoading(true);
        try {
            const ids = rows.map((r) => r.id);
            const refreshed = await refreshCurrentPrices(ids);
            // merge by id
            const map = new Map(refreshed.map((r) => [r.id, r]));
            setRows((prev) => prev.map((r) => (map.has(r.id) ? { ...r, ...map.get(r.id) } : r)));
            setLastUpdated(new Date());
        } catch (e) {
            alert('현재가격 갱신에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const headers = [
        'No',
        '티커',
        '기업명',
        '매수가격',
        '총매수가격',
        '매수일자',
        '현재가격',
        '매도목표가',
        '작업',
    ];

    return (
        <>
            {/* 페이지 제목 - 다른 화면과 동일 스타일 */}
            <h1 className='text-2xl md:text-3xl font-bold tracking-tight text-slate-800'>보유 종목 관리</h1>

            {/* 페이지 패딩 컨테이너 - 다른 화면과 동일 여백 */}
            <div className="px-2 py-8 md:px-4">
                {/* 상단 우측 액션 영역 */}
                <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="hidden md:block" />
                    <div className="flex items-center gap-3 text-sm">
                        <button
                            onClick={refreshPrices}
                            className="rounded-md border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-60"
                            disabled={loading || rows.length === 0}
                        >
                            현재가격 갱신
                        </button>
                        <span className="text-slate-500">
                            {lastUpdated ? `갱신: ${new Date(lastUpdated).toLocaleString()}` : '갱신 정보 없음'}
                        </span>
                    </div>
                </div>

                {/* 표 */}
                <div className="mx-0">
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-md scrollbar-always">
                        <table className="table-fixed min-w-[1040px] w-full">
                            <colgroup>
                                <col className="w-12" />  {/* No */}
                                <col className="w-20" />  {/* 티커 */}
                                <col className="w-48" />  {/* 기업명 */}
                                <col className="w-24" />  {/* 매수가격 */}
                                <col className="w-28" />  {/* 총매수가격 */}
                                <col className="w-28" />  {/* 매수일자 */}
                                <col className="w-24" />  {/* 현재가격 */}
                                <col className="w-24" />  {/* 매도목표가 */}
                                <col className="w-20" />  {/* 작업 */}
                            </colgroup>
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 text-xs md:text-sm sticky top-0 z-10">
                                    {headers.map((h) => (
                                        <th key={h} className="px-3 py-2 text-left font-medium border-b border-slate-200 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-sm whitespace-nowrap">
                                {rows.map((r, i) => (
                                    <tr key={r.id} className="border-b last:border-b-0">
                                        <Td>{i + 1}</Td>
                                        <EditableTd row={r} field="symbol" value={r.symbol} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} />
                                        <EditableTd row={r} field="companyName" value={r.companyName} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} />
                                        <EditableTd row={r} field="buyPrice" value={r.buyPrice} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                        <EditableTd row={r} field="totalBuyAmount" value={r.totalBuyAmount} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                        <EditableTd row={r} field="buyDate" value={r.buyDate} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="date" />
                                        <EditableTd row={r} field="currentPrice" value={r.currentPrice} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                        <EditableTd row={r} field="targetPrice" value={r.targetPrice} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                        <Td>
                                            <button
                                                onClick={() => removeRow(r.id)}
                                                className="px-2.5 py-1 rounded-md border text-xs hover:bg-rose-50 hover:border-rose-300"
                                                disabled={saving}
                                            >
                                                삭제
                                            </button>
                                        </Td>
                                    </tr>
                                ))}

                                {/* 신규 입력 행 */}
                                <tr className="bg-slate-50/60">
                                    <Td />
                                    <Td>
                                        <input
                                            value={newRow.symbol}
                                            onChange={(e) => setNewRow((p) => ({ ...p, symbol: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="티커"
                                        />
                                    </Td>
                                    <Td>
                                        <input
                                            value={newRow.companyName}
                                            onChange={(e) => setNewRow((p) => ({ ...p, companyName: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="기업명"
                                        />
                                    </Td>
                                    <Td>
                                        <input
                                            value={newRow.buyPrice}
                                            onChange={(e) => setNewRow((p) => ({ ...p, buyPrice: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="매수가"
                                            type="number"
                                        />
                                    </Td>
                                    <Td>
                                        <input
                                            value={newRow.totalBuyAmount}
                                            onChange={(e) => setNewRow((p) => ({ ...p, totalBuyAmount: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="총매수"
                                            type="number"
                                        />
                                    </Td>
                                    <Td>
                                        <input
                                            value={newRow.buyDate}
                                            onChange={(e) => setNewRow((p) => ({ ...p, buyDate: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            type="date"
                                        />
                                    </Td>
                                    <Td>
                                        <input
                                            value={newRow.currentPrice}
                                            onChange={(e) => setNewRow((p) => ({ ...p, currentPrice: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="현재가"
                                            type="number"
                                        />
                                    </Td>
                                    <Td>
                                        <input
                                            value={newRow.targetPrice}
                                            onChange={(e) => setNewRow((p) => ({ ...p, targetPrice: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="목표가"
                                            type="number"
                                        />
                                    </Td>
                                    <Td>
                                        <button
                                            onClick={addRow}
                                            className="px-2.5 py-1 rounded-md border text-xs hover:bg-emerald-50 hover:border-emerald-300"
                                            disabled={saving}
                                        >
                                            등록
                                        </button>
                                    </Td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {loading && (
                    <div className="mt-3 text-sm text-slate-500">불러오는 중…</div>
                )}
            </div>
        </>
    );
}

function Td({ children }) {
    return <td className="px-3 py-2 align-middle">{children}</td>;
}

function EditableTd({ row, field, value, startEdit, editing, setEditing, draft, setDraft, commitEdit, type = 'text' }) {
    const isEdit = editing && editing.id === row.id && editing.field === field;

    if (!isEdit) {
        const display = field.toLowerCase().includes('price') || field.toLowerCase().includes('amount')
            ? fmtNum(value)
            : field === 'buyDate'
                ? fmtDate(value)
                : value ?? '';

        return (
            <Td>
                <div
                    className="min-h-[30px] cursor-pointer hover:bg-slate-50 rounded px-1"
                    onDoubleClick={() => startEdit(row, field)}
                    title="더블클릭하여 수정"
                >
                    {display}
                </div>
            </Td>
        );
    }

    return (
        <Td>
            <input
                autoFocus
                type={type}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') {
                        setDraft(row[field] ?? '');
                        setEditing(null);
                    }
                }}
                onBlur={commitEdit}
                className="w-full rounded border px-2 py-1 text-sm"
            />
        </Td>
    );
}
