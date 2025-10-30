import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refreshCurrentPrices,
    fetchFxRate,
    fetchCurrentPricesBySymbols,
} from '@/pages/transaction/services/TransactionService'

const toNum = (v) => (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v));

function fmtNum(n, d = 2) {
    if (n == null || n === '' || isNaN(Number(n))) return '';
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
}

function fmtUsd(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '';
    return Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fmtDate(d) {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 심볼, 매수일 순 정렬 헬퍼
function sortRowsBySymbolAndDate(list) {
    return [...list].sort((a, b) => {
        const sa = String(a.symbol || '').toUpperCase();
        const sb = String(b.symbol || '').toUpperCase();
        if (sa === sb) {
            const da = a.buyDate ? new Date(a.buyDate) : new Date(0);
            const db = b.buyDate ? new Date(b.buyDate) : new Date(0);
            return da - db; // ASC
        }
        return sa.localeCompare(sb);
    });
}

const INITIAL_NEW_ROW = {
    symbol: '',
    companyName: '',
    buyPrice: '',
    totalBuyAmount: '',
    buyDate: '',
    currentPrice: '',
    targetPrice: '',
    rmk: '',
};

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
    const [newRow, setNewRow] = useState(INITIAL_NEW_ROW);

    // 최초 로드 시 목록 조회
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const list = await fetchTransactions();
                setRows(sortRowsBySymbolAndDate(list));
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
            setRows(sortRowsBySymbolAndDate(list));
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
            // 0) 기존 rows 의 현재가를 심볼로 보존 (refetch 시 사라지는 문제 방지)
            const prevPriceBySym = new Map(
                rows.map((r) => [String(r.symbol || '').toUpperCase(), r.currentPrice])
            );

            // 1) 등록
            await createTransaction(payload);

            // 2) 목록 재조회
            const list = await fetchTransactions();

            // 3) 재조회된 목록에 기존 현재가(있던 값) 우선 머지
            const merged = list.map((r) => {
                const sym = String(r.symbol || '').toUpperCase();
                const prevCp = prevPriceBySym.get(sym);
                return (prevCp !== undefined && prevCp !== null && prevCp !== '')
                    ? { ...r, currentPrice: prevCp }
                    : r;
            });
            setRows(sortRowsBySymbolAndDate(merged));

            // 4) 방금 등록한 심볼만이 아니라 화면 내 **모든 심볼**의 현재가를 동기화
            const allSymbols = Array.from(new Set(merged.map((r) => r.symbol)));
            await mergePricesBySymbols(allSymbols);

            // 5) 입력값 초기화 및 갱신시각 기록
            setNewRow(INITIAL_NEW_ROW);
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
            // 1) 모든 행의 심볼로 현재가 갱신 (동일 심볼은 전부 같은 값 적용)
            await mergePricesBySymbols(rows.map((r) => r.symbol));

            // 2) 환율도 함께 갱신
            const fx = await fetchFxRate();
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
        '매도목표가\n(현재-목표)',
        '단일가격차\n(현재-매수)',
        '총 가격차\n(총현재-총매수)',
        '비고',
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
    // -------------------------------------------------------------------------

    // 그룹 행 구성: 같은 티커가 2개 이상인 경우, 해당 그룹 마지막 아래에 합계 행 삽입
    const groupedRows = (() => {
        const out = [];
        let i = 0;
        const n = rows.length;
        while (i < n) {
            const start = i;
            const sym = String(rows[i].symbol || '').toUpperCase();
            let end = i;
            while (end < n && String(rows[end].symbol || '').toUpperCase() === sym) end++;
            const count = end - start;
            // push group rows (annotate only when it is a real group of 2+)
            if (count >= 2) {
                // add a synthetic divider row before the group to draw a thick top line
                out.push({ __type: 'groupStartDivider', symbol: sym });
                for (let k = start; k < end; k++) {
                    out.push({
                        ...rows[k],
                        __groupKey: sym,
                        __isGroupStart: k === start,
                        __isGroupEnd: k === end - 1,
                    });
                }
            } else {
                // single row (not grouped) stays as-is
                for (let k = start; k < end; k++) out.push(rows[k]);
            }
            // subtotal if 2+
            if (count >= 2) {
                const slice = rows.slice(start, end);
                const qtySum = slice.reduce((s, r) => s + toNum(r.totalBuyAmount), 0);
                const buySumUSD = slice.reduce((s, r) => s + toNum(r.buyPrice) * toNum(r.totalBuyAmount), 0);
                const curSumUSD = slice.reduce((s, r) => s + toNum(r.currentPrice) * toNum(r.totalBuyAmount), 0);
                const diffUSD = curSumUSD - buySumUSD;
                const diffPct = buySumUSD > 0 ? (diffUSD / buySumUSD) * 100 : 0;
                // 현재가: 동일하다고 가정하되, 안전하게 평균값 사용 (빈 값 제외)
                const curList = slice.map(r => toNum(r.currentPrice)).filter(v => v > 0);
                const curUSD = curList.length ? (curList.reduce((a, b) => a + b, 0) / curList.length) : 0;
                // 매도목표가: 평균값 (빈 값 제외)
                const tgtList = slice.map(r => toNum(r.targetPrice)).filter(v => v > 0);
                const targetAvgUSD = tgtList.length ? (tgtList.reduce((a, b) => a + b, 0) / tgtList.length) : 0;
                // lookahead: check if next chunk is also a real group (>=2)
                let nextIsGroup = false;
                if (end < n) {
                    const nextSym = String(rows[end].symbol || '').toUpperCase();
                    let j = end;
                    while (j < n && String(rows[j].symbol || '').toUpperCase() === nextSym) j++;
                    const nextCount = j - end;
                    nextIsGroup = nextCount >= 2;
                }
                out.push({
                    __type: 'groupTotal',
                    symbol: sym,
                    qtySum,
                    buySumUSD,
                    curSumUSD,
                    diffUSD,
                    diffPct,
                    curUSD,
                    targetAvgUSD,
                    hasNextGroupDivider: nextIsGroup,
                });
            }
            i = end;
        }
        return out;
    })();


    // 심볼 목록으로 현재가를 조회해서 모든 동일 심볼 행에 머지
    const mergePricesBySymbols = async (symbols = []) => {
        const unique = Array.from(
            new Set(symbols.filter(Boolean).map((s) => String(s).toUpperCase()))
        );
        if (unique.length === 0) return;

        const priceList = await fetchCurrentPricesBySymbols(unique);
        const bySym = new Map(priceList.map((p) => [String(p.symbol).toUpperCase(), p]));

        setRows((prev) =>
            prev.map((r) => {
                const sym = String(r.symbol || '').toUpperCase();
                const hit = bySym.get(sym);
                return hit ? { ...r, currentPrice: Number(hit.currentPrice) } : r;
            })
        );
        setLastUpdated(new Date());
    };

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
                    <div className="overflow-x-auto overflow-y-auto bg-white border border-slate-200 rounded-md scrollbar-always max-h-[70vh]">
                        <table className="table-fixed min-w-[1880px] w-full border-collapse">
                            <colgroup>
                                {[
                                    'w-12',   // No
                                    'w-20',   // 티커
                                    'w-44',   // 기업명
                                    'w-28',   // 매수일자
                                    'w-24',   // 매수가격(USD)
                                    'w-28',   // 매수가격(₩)
                                    'w-24',   // 수량
                                    'w-28',   // 총매수금액(USD)
                                    'w-32',   // 총매수금액(₩)
                                    'w-24',   // 현재가격(USD)
                                    'w-28',   // 현재가격(₩)
                                    'w-32',   // 총현재가치(USD)
                                    'w-36',   // 총현재가치(₩)
                                    'w-24',   // 매도목표가
                                    'w-24',   // 가격차 (축소)
                                    'w-36',   // 총 가격차
                                    "w-48",   // 비고 (확대)
                                    "w-20",   // 작업
                                ].map((w, i) => (
                                    <col key={i} className={w} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 text-xs md:text-sm sticky top-0 z-50">
                                    {headers.map((h, idx) => (
                                        <th
                                            key={h}
                                            className={`px-3 py-2 text-center font-medium border-b border-slate-200 whitespace-nowrap sticky top-0 bg-slate-50 ${idx === 0 ? 'left-0 z-60' : idx === 1 ? 'left-12 z-60' : 'z-50'
                                                }`}
                                        >
                                            {typeof h === 'string' && h.includes('\n') ? (
                                                <div className="leading-tight">
                                                    {h.split('\n').map((line, i2) => (
                                                        <div key={i2} className={i2 === 1 ? 'text-[11px] font-normal text-slate-500' : ''}>{line}</div>
                                                    ))}
                                                </div>
                                            ) : h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-sm whitespace-nowrap">
                                {groupedRows.map((r, i) => {
                                    if (r.__type === 'groupStartDivider') {
                                        return (
                                            <tr key={`gs-${r.symbol}-${i}`}>
                                                <td colSpan={headers.length} className="p-0">
                                                    <div className="h-0 border-t-2 border-slate-400" />
                                                </td>
                                            </tr>
                                        );
                                    }
                                    if (r.__type === 'groupTotal') {
                                        // c14: 단일가격차(현재-매수) per-share, c15: 총 가격차(총현재-총매수)
                                        return (
                                            <tr
                                                key={`g-${r.symbol}-${i}`}
                                                className={`bg-slate-50 font-semibold border-t-0 ${r.hasNextGroupDivider ? 'border-b-0' : 'border-b-2'} border-slate-400`}
                                            >
                                                {[
                                                    <Td key="c0" className="sticky left-0 z-10 bg-slate-50" />,
                                                    <Td key="c1" className="sticky left-12 z-10 bg-slate-50 font-semibold text-slate-700">{r.symbol} 합계</Td>,
                                                    <Td key="c2" />,
                                                    <Td key="c3" />,
                                                    <Td key="c4" />,
                                                    <Td key="c5" />,
                                                    <Td key="c6"><div className="px-1 h-9 flex items-center">{r.qtySum ? fmtNum(r.qtySum, 0) : ''}</div></Td>,
                                                    <UsdCell key="c7" value={r.buySumUSD} />,
                                                    <KrwCell key="c8" value={Math.round(r.buySumUSD * (fx || 0))} />,
                                                    <UsdCell key="c9" value={r.curUSD} />,
                                                    <KrwCell key="c10" value={Math.round(r.curUSD * (fx || 0))} />,
                                                    <UsdCell key="c11" value={r.curSumUSD} />,
                                                    <KrwCell key="c12" value={Math.round(r.curSumUSD * (fx || 0))} />,
                                                    <Td key="c13">
                                                        <div className="px-1 leading-tight text-center">
                                                            <div>{r.targetAvgUSD ? `$ ${fmtUsd(r.targetAvgUSD)}` : ''}</div>
                                                            {(() => {
                                                                const cur = toNum(r.curUSD);
                                                                const tgt = toNum(r.targetAvgUSD);
                                                                if (!(cur || tgt)) return null;
                                                                const d = cur - tgt; // 현재가 - 목표가(평균)
                                                                const pos = d >= 0;
                                                                const cls = pos ? 'text-rose-600' : 'text-blue-600';
                                                                return <div className={`${cls} text-[11px]`}>{`(${pos ? '+' : ''}$ ${fmtUsd(d)})`}</div>;
                                                            })()}
                                                        </div>
                                                    </Td>,
                                                    // c14: per-share 단일가격차(현재-매수)
                                                    <Td key="c14">
                                                        {(() => {
                                                            const qty = toNum(r.qtySum);
                                                            const cur = toNum(r.curUSD);
                                                            const buyAvg = qty > 0 ? toNum(r.buySumUSD) / qty : 0;
                                                            const d = cur - buyAvg; // per-share diff
                                                            if (!(cur || buyAvg)) return null;
                                                            const pos = d >= 0;
                                                            const cls = pos ? 'text-rose-600' : 'text-blue-600';
                                                            const dKrw = (fx || 0) ? Math.round(d * (fx || 0)) : 0;
                                                            const pct = buyAvg > 0 ? (d / buyAvg) * 100 : 0;
                                                            return (
                                                                <div className="px-1 leading-tight text-center">
                                                                    <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtUsd(d)}</div>
                                                                    <div className="text-[11px] text-slate-500">{dKrw ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                                                                    <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </Td>,
                                                    // c15: 총 가격차(총현재-총매수)
                                                    <Td key="c15">
                                                        {(() => {
                                                            const d = toNum(r.diffUSD);
                                                            const pos = d >= 0;
                                                            const cls = pos ? 'text-rose-600' : 'text-blue-600';
                                                            const dKrw = (fx || 0) ? Math.round(d * (fx || 0)) : 0;
                                                            const pct = toNum(r.buySumUSD) > 0 ? (d / toNum(r.buySumUSD)) * 100 : 0;
                                                            return (
                                                                <div className="px-1 leading-tight text-center">
                                                                    <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtUsd(d)}</div>
                                                                    <div className="text-[11px] text-slate-500">{dKrw ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                                                                    <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </Td>,
                                                    <Td key="c16" />,
                                                    <Td key="c17" />
                                                ]}
                                            </tr>
                                        );
                                    }

                                    // 목표가 달성 여부
                                    const isHit = toNum(r.targetPrice) > 0 && toNum(r.currentPrice) >= toNum(r.targetPrice);

                                    return (
                                        <tr
                                            key={r.id}
                                            className={`border-b border-slate-200 ${r.__isGroupEnd ? 'border-b-0' : ''} ${isHit ? 'bg-yellow-50' : ''}`}
                                        >
                                            <Td className={`sticky left-0 z-10 ${isHit ? 'bg-yellow-50' : 'bg-white'}`}>{i + 1}</Td>
                                            <EditableTd tdClassName={`sticky left-12 z-10 ${isHit ? 'bg-yellow-50' : 'bg-white'}`} row={r} field="symbol" value={r.symbol} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} />
                                            <EditableTd row={r} field="companyName" value={r.companyName} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} />

                                            {/* 매수일자 */}
                                            <EditableTd row={r} field="buyDate" value={r.buyDate} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="date" />

                                            {/* 매수가격 USD + 원화환산 */}
                                            <EditableTd row={r} field="buyPrice" value={r.buyPrice} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                            <KrwCell value={toNum(r.buyPrice) * (fx || 0)} />

                                            {/* 수량 + 총매수금액(USD/₩) */}
                                            <EditableTd row={r} field="totalBuyAmount" value={r.totalBuyAmount} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />
                                            <UsdCell value={toNum(r.totalBuyAmount) * toNum(r.buyPrice)} />
                                            <KrwCell value={Math.round(toNum(r.totalBuyAmount) * toNum(r.buyPrice) * (fx || 0))} />

                                            {/* 현재가격 USD + 원화환산 (읽기 전용) */}
                                            <UsdCell value={toNum(r.currentPrice)} />
                                            <KrwCell value={toNum(r.currentPrice) * (fx || 0)} />

                                            {/* 총현재가치 (USD/₩) */}
                                            <UsdCell value={toNum(r.currentPrice) * toNum(r.totalBuyAmount)} />
                                            <KrwCell value={Math.round(toNum(r.currentPrice) * toNum(r.totalBuyAmount) * (fx || 0))} />

                                            {/* 매도목표가 */}
                                            <EditableTd row={r} field="targetPrice" value={r.targetPrice} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} type="number" />

                                            {/* 가격차 (현재-매수): USD, KRW, % */}
                                            <DiffCell buy={toNum(r.buyPrice)} cur={toNum(r.currentPrice)} fx={fx} />
                                            {/* 총 가격차 (총현재-총매수) */}
                                            <TotalDiffCell buy={toNum(r.buyPrice)} cur={toNum(r.currentPrice)} qty={toNum(r.totalBuyAmount)} fx={fx} />

                                            {/* 비고 */}
                                            <EditableTd row={r} field="rmk" value={r.rmk} startEdit={startEdit} editing={editing} setEditing={setEditing} draft={draft} setDraft={setDraft} commitEdit={commitEdit} />

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
                                    );
                                })}

                                {/* 신규 입력 행 */}
                                <tr className="bg-slate-50/60">
                                    <Td className="sticky left-0 z-10 bg-white" />
                                    <Td className="sticky left-12 z-10 bg-white">
                                        <input
                                            value={newRow.symbol}
                                            onChange={(e) => setNewRow((p) => ({ ...p, symbol: e.target.value }))}
                                            className="w-full h-9 rounded border px-2 text-sm"
                                            placeholder="티커"
                                        />
                                    </Td>
                                    <Td>
                                        <input
                                            value={newRow.companyName}
                                            onChange={(e) => setNewRow((p) => ({ ...p, companyName: e.target.value }))}
                                            className="w-full h-9 rounded border px-2 text-sm"
                                            placeholder="기업명"
                                        />
                                    </Td>
                                    {/* 매수일자 */}
                                    <Td>
                                        <input
                                            value={newRow.buyDate}
                                            onChange={(e) => setNewRow((p) => ({ ...p, buyDate: e.target.value }))}
                                            className="w-full h-9 rounded border px-2 text-sm"
                                            type="date"
                                        />
                                    </Td>
                                    {/* 매수가격(USD) */}
                                    <Td>
                                        <input
                                            value={newRow.buyPrice}
                                            onChange={(e) => setNewRow((p) => ({ ...p, buyPrice: e.target.value }))}
                                            className="w-full h-9 rounded border px-2 text-sm"
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
                                            className="w-full h-9 rounded border px-2 text-sm"
                                            placeholder="수량"
                                            type="number"
                                        />
                                    </Td>
                                    {/* 총매수금액(USD) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 총매수금액(₩) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 현재가격(USD) - 백단 갱신 필드(입력 불가) */}
                                    <Td />
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
                                            className="w-full h-9 rounded border px-2 text-sm"
                                            placeholder="목표가"
                                            type="number"
                                        />
                                    </Td>
                                    {/* 가격차(현재-매수) - 계산필드(빈칸) */}
                                    <Td />
                                    {/* 총가격차(현재-매수) - 계산필드(빈칸) */}
                                    <Td>

                                    </Td>
                                    {/* 비고 입력 */}
                                    <Td>
                                        <input
                                            value={newRow.rmk}
                                            onChange={(e) => setNewRow((p) => ({ ...p, rmk: e.target.value }))}
                                            className="w-full h-9 rounded border px-2 text-sm"
                                            placeholder="비고"
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

                        <div className="p-3 border-t border-slate-200 text-sm flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                <span className="text-slate-600">
                                    총매수금액: <b>$ {fmtUsd(totals.buySum)}</b>
                                    {fx ? ` (≈ ₩${Math.round(totals.buySum * fx).toLocaleString()})` : ''}
                                </span>
                                <span className="text-slate-600">
                                    총현재가치: <b>$ {fmtUsd(totals.curSum)}</b>
                                    {fx ? ` (≈ ₩${Math.round(totals.curSum * fx).toLocaleString()})` : ''}
                                </span>
                            </div>
                            <div className="mt-1 md:mt-0">
                                <span className={diff >= 0 ? 'text-rose-600 font-semibold' : 'text-blue-600 font-semibold'}>
                                    $ {diff >= 0 ? '+' : ''}{fmtUsd(diff)}
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

function Td({ children, className = '' }) {
    return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}

function EditableTd({ row, field, value, startEdit, editing, setEditing, draft, setDraft, commitEdit, type = 'text', tdClassName = '' }) {
    const isEdit = editing && editing.id === row.id && editing.field === field;

    if (!isEdit) {
        const isMoney = field.toLowerCase().includes('price');
        const isDate = field === 'buyDate';
        const main = isMoney ? `$ ${fmtUsd(value)}` : isDate ? fmtDate(value) : (value ?? '');
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
        // 매도목표가 셀: 현재가와의 차이를 보조 줄에 표시 (읽기 전용)
        let subTargetDiff = null;
        if (field === 'targetPrice') {
            const cur = toNum(row.currentPrice);
            const tgt = toNum(value);
            if (cur || tgt) {
                const d = cur - tgt; // 현재가 - 목표가
                const pos = d >= 0;
                const cls = pos ? 'text-rose-600' : 'text-blue-600';
                subTargetDiff = (
                    <div className={`${cls} text-[11px]`}>{`(${pos ? '+' : ''}$ ${fmtUsd(d)})`}</div>
                );
            }
        }
        const isTwoLine = field === 'targetPrice' && !!subTargetDiff;
        return (
            <Td className={tdClassName}>
                <div
                    className={
                        isTwoLine
                            ? 'min-h-[40px] flex flex-col justify-center items-start cursor-pointer hover:bg-slate-50 rounded px-1'
                            : 'h-9 flex items-center cursor-pointer hover:bg-slate-50 rounded px-1'
                    }
                    onDoubleClick={() => startEdit(row, field)}
                    title="더블클릭하여 수정"
                >
                    <div>{main}</div>
                    {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
                    {subTargetDiff}
                    {subTotal && <div className="text-[11px] text-slate-500">{subTotal}</div>}
                </div>
            </Td>
        );
    }

    return (
        <Td className={tdClassName}>
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
                className="w-full h-9 rounded border px-2 text-sm"
            />
        </Td>
    );
}

function KrwCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="px-1 h-9 flex items-center">
                {v ? `₩ ${Math.round(v).toLocaleString()}` : ''}
            </div>
        </Td>
    );
}

function UsdCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="px-1 h-9 flex items-center">
                {v ? `$ ${fmtUsd(v)}` : ''}
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
            <div className="px-1 leading-tight text-center">
                <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtUsd(d)}</div>
                <div className="text-[11px] text-slate-500">{fx ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
            </div>
        </Td>
    );
}

function TotalDiffCell({ buy, cur, qty, fx }) {
    const b = toNum(buy);
    const c = toNum(cur);
    const q = toNum(qty);
    const buySum = b * q;
    const curSum = c * q;
    const d = curSum - buySum; // total diff USD
    const dKrw = fx ? Math.round(d * fx) : 0;
    const pct = buySum > 0 ? (d / buySum) * 100 : 0;
    const pos = d >= 0;
    const cls = pos ? 'text-rose-600' : 'text-blue-600';

    return (
        <Td>
            <div className="px-1 leading-tight text-center">
                <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtUsd(d)}</div>
                <div className="text-[11px] text-slate-500">{fx ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
            </div>
        </Td>
    );
}
