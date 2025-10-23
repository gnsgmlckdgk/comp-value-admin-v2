import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refreshCurrentPrices,
    fetchFxRate,
} from '@/pages/transaction/services/TransactionService'

const toNum = (v) => (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v));

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

    // 환율
    const [fxRate, setFxRate] = useState(null); // USD->KRW
    const [fxUpdatedAt, setFxUpdatedAt] = useState(null);

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

    // 환율정보조회
    useEffect(() => {
        (async () => {
            try {
                const fx = await fetchFxRate();
                setFxRate(fx?.rate ?? null);
                setFxUpdatedAt(fx?.updatedAt ? new Date(fx.updatedAt) : new Date());
            } catch (e) {
                // 무시
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
            const [refreshed, fx] = await Promise.all([
                refreshCurrentPrices(ids),
                fetchFxRate(),
            ]);
            const map = new Map(refreshed.map((r) => [r.id, r]));
            setRows((prev) => prev.map((r) => (map.has(r.id) ? { ...r, ...map.get(r.id) } : r)));
            setFxRate(fx?.rate ?? fxRate);
            setFxUpdatedAt(fx?.updatedAt ? new Date(fx.updatedAt) : new Date());
            setLastUpdated(new Date());
        } catch (e) {
            alert('현재가격/환율 갱신에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const headers = [
        'No',
        '티커',
        '기업명',
        '매수일자',
        '매수가격',
        '매수가격(₩)',
        '수량',
        '총매수금액(USD)',
        '총매수금액(₩)',
        '현재가격',
        '현재가격(₩)',
        '총현재가치(USD)',
        '총현재가치(₩)',
        '매도목표가',
        '가격차(현재-매수)',
        '작업',
    ];

    const totals = rows.reduce((acc, r) => {
        const qty = toNum(r.totalBuyAmount);   // 총매수가격 컬럼을 '수량'으로 사용
        const buy = toNum(r.buyPrice);
        const cur = toNum(r.currentPrice);
        acc.buySum += buy * qty;               // 총매수시세 (USD)
        acc.curSum += cur * qty;               // 총현재시세 (USD)
        return acc;
    }, { buySum: 0, curSum: 0 });

    const diff = totals.curSum - totals.buySum;
    const diffPct = totals.buySum > 0 ? (diff / totals.buySum) * 100 : 0;
    const fx = fxRate || 0;

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
                        <span className="text-slate-500">
                            {fxRate ? `환율: 1 USD ≈ ${Math.round(fxRate).toLocaleString()}원` : '환율 정보 없음'}
                        </span>
                    </div>
                </div>

                {/* 표 */}
                <div className="mx-0">
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-md scrollbar-always">
                        <table className="table-fixed min-w-[1760px] w-full">
                            <colgroup>
                                <col className="w-12" />  {/* No */}
                                <col className="w-20" />  {/* 티커 */}
                                <col className="w-44" />  {/* 기업명 */}
                                <col className="w-28" />  {/* 매수일자 */}
                                <col className="w-24" />  {/* 매수가격(USD) */}
                                <col className="w-28" />  {/* 매수가격(₩) */}
                                <col className="w-24" />  {/* 수량 */}
                                <col className="w-28" />  {/* 총매수금액(USD) */}
                                <col className="w-32" />  {/* 총매수금액(₩) */}
                                <col className="w-24" />  {/* 현재가격(USD) */}
                                <col className="w-28" />  {/* 현재가격(₩) */}
                                <col className="w-32" />  {/* 총현재가치(USD) */}
                                <col className="w-36" />  {/* 총현재가치(₩) */}
                                <col className="w-24" />  {/* 매도목표가 */}
                                <col className="w-36" />  {/* 가격차 */}
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

                                        {/* 매수일자 */}
                                        <EditableTd row={r} field="buyDate" value={r.buyDate} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="date" />

                                        {/* 매수가격 USD + 원화환산 */}
                                        <EditableTd row={r} field="buyPrice" value={r.buyPrice} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                        <KrwCell value={toNum(r.buyPrice) * (fx || 0)} />

                                        {/* 수량(=총매수가격 컬럼을 수량으로 사용) + 총매수금액(USD/₩) */}
                                        <EditableTd row={r} field="totalBuyAmount" value={r.totalBuyAmount} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                        <UsdCell value={toNum(r.totalBuyAmount) * toNum(r.buyPrice)} />
                                        <KrwCell value={Math.round(toNum(r.totalBuyAmount) * toNum(r.buyPrice) * (fx || 0))} />

                                        {/* 현재가격 USD + 원화환산 */}
                                        <EditableTd row={r} field="currentPrice" value={r.currentPrice} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                        <KrwCell value={toNum(r.currentPrice) * (fx || 0)} />

                                        {/* 총현재가치 (USD/₩) */}
                                        <UsdCell value={toNum(r.currentPrice) * toNum(r.totalBuyAmount)} />
                                        <KrwCell value={Math.round(toNum(r.currentPrice) * toNum(r.totalBuyAmount) * (fx || 0))} />

                                        {/* 매도목표가 */}
                                        <EditableTd row={r} field="targetPrice" value={r.targetPrice} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />

                                        {/* 가격차 (현재-매수): USD, KRW, % */}
                                        <DiffCell buy={toNum(r.buyPrice)} cur={toNum(r.currentPrice)} fx={fx} />

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
                                    {/* 매수일자 */}
                                    <Td>
                                        <input
                                            value={newRow.buyDate}
                                            onChange={(e) => setNewRow((p) => ({ ...p, buyDate: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            type="date"
                                        />
                                    </Td>
                                    {/* 매수가격(USD) */}
                                    <Td>
                                        <input
                                            value={newRow.buyPrice}
                                            onChange={(e) => setNewRow((p) => ({ ...p, buyPrice: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="매수가"
                                            type="number"
                                        />
                                    </Td>
                                    {/* 매수가격(₩) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 수량 */}
                                    <Td>
                                        <input
                                            value={newRow.totalBuyAmount}
                                            onChange={(e) => setNewRow((p) => ({ ...p, totalBuyAmount: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="수량"
                                            type="number"
                                        />
                                    </Td>
                                    {/* 총매수금액(USD) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 총매수금액(₩) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 현재가격(USD) */}
                                    <Td>
                                        <input
                                            value={newRow.currentPrice}
                                            onChange={(e) => setNewRow((p) => ({ ...p, currentPrice: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="현재가"
                                            type="number"
                                        />
                                    </Td>
                                    {/* 현재가격(₩) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 총현재가치(USD) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 총현재가치(₩) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 매도목표가 */}
                                    <Td>
                                        <input
                                            value={newRow.targetPrice}
                                            onChange={(e) => setNewRow((p) => ({ ...p, targetPrice: e.target.value }))}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                            placeholder="목표가"
                                            type="number"
                                        />
                                    </Td>
                                    {/* 가격차(현재-매수) - 계산필드(빈칸) */}
                                    <Td />
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

                        <div className="p-3 border-t border-slate-200 text-sm flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                <span className="text-slate-600">
                                    총매수금액: <b>${fmtNum(totals.buySum)}</b>
                                    {fx ? ` (≈ ₩${Math.round(totals.buySum * fx).toLocaleString()})` : ''}
                                </span>
                                <span className="text-slate-600">
                                    총현재가치: <b>${fmtNum(totals.curSum)}</b>
                                    {fx ? ` (≈ ₩${Math.round(totals.curSum * fx).toLocaleString()})` : ''}
                                </span>
                            </div>
                            <div className="mt-1 md:mt-0">
                                <span className={diff >= 0 ? 'text-rose-600 font-semibold' : 'text-blue-600 font-semibold'}>
                                    {diff >= 0 ? '+' : ''}{fmtNum(diff)} USD
                                    {fx ? `  (≈ ₩${Math.round(diff * fx).toLocaleString()})` : ''}
                                    {`  ( ${diff >= 0 ? '+' : ''}${diffPct.toFixed(2)}% )`}
                                </span>
                            </div>
                        </div>
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
        const isMoney = field.toLowerCase().includes('price');
        const isDate = field === 'buyDate';
        const main = isMoney ? `$ ${fmtNum(value)}` : isDate ? fmtDate(value) : (value ?? '');
        const showKrw = false;      // 별도 KRW 컬럼에서 표시
        let sub = null;
        if (showKrw) {
            const v = toNum(value) * fx;
            sub = `₩ ${Math.round(v).toLocaleString()}`;
        }
        const showKrwTotal = false; // 별도 KRW 컬럼에서 표시
        let subTotal = null;
        if (showKrwTotal) {
            const qty = toNum(row.totalBuyAmount);
            const buy = toNum(row.buyPrice);
            const krwTotal = Math.round(qty * buy * fx);
            subTotal = `₩ ${krwTotal.toLocaleString()}`; // (매수가 * 수량) KRW
        }
        return (
            <Td>
                <div
                    className="min-h-[30px] cursor-pointer hover:bg-slate-50 rounded px-1"
                    onDoubleClick={() => startEdit(row, field)}
                    title="더블클릭하여 수정"
                >
                    <div>{main}</div>
                    {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
                    {subTotal && <div className="text-[11px] text-slate-500">{subTotal}</div>}
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

function KrwCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="px-1">
                {v ? `₩ ${v.toLocaleString()}` : ''}
            </div>
        </Td>
    );
}

function UsdCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="px-1">
                {v ? `$ ${fmtNum(v)}` : ''}
            </div>
        </Td>
    );
}

function DiffCell({ buy, cur, fx }) {
    const b = toNum(buy);
    const c = toNum(cur);
    const d = c - b; // per-share diff USD
    const dKrw = fx ? Math.round(d * fx) : 0;
    const pct = b > 0 ? (d / b) * 100 : 0;
    const pos = d >= 0;
    const cls = pos ? 'text-rose-600' : 'text-blue-600';

    return (
        <Td>
            <div className="px-1 leading-tight">
                <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtNum(d)}</div>
                <div className="text-[11px] text-slate-500">{fx ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
            </div>
        </Td>
    );
}
