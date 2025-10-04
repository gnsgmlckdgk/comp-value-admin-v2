import Loading from '@/component/common/display/Loading';
import { useState, useEffect, useRef } from 'react'

import { send } from '@/util/ClientUtil';

/**
 * 해외 기업 가치 계산
 * @returns 
 */
const AbroadCompValue = () => {

    const [isLoading, setIsLoading] = useState(false);

    const [compName, setCompName] = useState('');
    const [compNameData, setCompNameData] = useState([]);

    const [compValueData, setCompValueData] = useState({})
    const [showPopup, setShowPopup] = useState(false);
    const popupRef = useRef(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') setShowPopup(false);
        };
        if (showPopup) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showPopup]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1800);
        return () => clearTimeout(t);
    }, [toast]);

    // ---- helpers for popup rendering ----
    const toNumber = (v) => {
        if (v == null) return NaN;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
            const s = v.replace(/[,%\s]/g, ''); // remove commas/spaces/%
            const n = Number(s);
            return Number.isNaN(n) ? NaN : n;
        }
        return NaN;
    };

    const fmtNum = (v, digits = 2) => {
        const n = toNumber(v);
        if (Number.isNaN(n)) return '-';
        try {
            return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n);
        } catch {
            return String(v);
        }
    };
    const fmtUsd = (v, digits = 2) => (v == null ? '-' : `$${fmtNum(v, digits)}`);
    const fmtPct = (ratio, digits = 1) => {
        const n = toNumber(ratio);
        return Number.isNaN(n) ? '-' : `${(n * 100).toFixed(digits)}%`;
    };

    const getVal = (obj, keys) => {
        for (const k of keys) {
            if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
        }
        return undefined;
    };

    // Look into common nested containers as well (one level deep)
    const getValDeep = (obj, keys) => {
        const direct = getVal(obj, keys);
        if (direct !== undefined) return direct;
        if (!obj || typeof obj !== 'object') return undefined;
        const containers = ['상세', '상세정보', 'detail', 'details', 'metric', 'metrics', 'valuation', 'summary', 'data'];
        for (const c of containers) {
            if (obj[c] && typeof obj[c] === 'object') {
                const found = getVal(obj[c], keys);
                if (found !== undefined) return found;
            }
        }
        // one-level shallow scan of any object-typed child
        for (const [k, v] of Object.entries(obj)) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                const found = getVal(v, keys);
                if (found !== undefined) return found;
            }
        }
        return undefined;
    };

    /**
     * 기업 심볼 조회
     */
    const compSymbolSearch = async () => {
        setIsLoading(true);

        const sendUrl = `/dart/abroad/company/search/symbol?cn=${compName}`;
        const { data, error } = await send(sendUrl, {}, "GET");

        if (error == null) {
            setCompNameData(data.response);
        } else {
            setCompNameData([]);
        }

        setIsLoading(false);
    }

    /**
     * 기업가치 계산
     */
    const compValueCal = async (row) => {

        if (!compNameData || Object.keys(compNameData).length === 0) {
            alert('기업 정보가 존재하지 않습니다.');
            return;
        }

        const symbol = row.symbol;
        if (!symbol) {
            alert('심볼 정보가 존재하지 않습니다.');
            return;
        }

        setIsLoading(true);

        const sendUrl = `/dart/main/cal/per_value/abroad/v2?symbol=${symbol}`;
        const { data, error } = await send(sendUrl, {}, "GET");

        console.log('data', data);
        console.log('error', error);

        if (error == null && data && data.response && Object.keys(data.response).length > 0) {
            setCompValueData(data.response);
            setShowPopup(true);
        } else {
            setCompValueData({});
            alert('조회 결과가 존재하지 않거나 서버 응답을 받지 못했습니다.');
        }

        setIsLoading(false);
    }

    return (
        <div>

            <Loading show={isLoading} />

            <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">기업분석(해외)</h1>
                <p className="mt-1 text-sm text-slate-500">심볼을 검색하고 행을 클릭하면 기업가치 계산 결과를 팝업으로 확인할 수 있어요.</p>
            </div>

            <div className="space-y-4">
                {/* search */}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={compName}
                        onChange={e => setCompName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); compSymbolSearch(); } }}
                        placeholder="심볼/회사명으로 검색 (Enter)"
                        className="w-[min(520px,90vw)] px-3 py-2 rounded-md border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                        onClick={compSymbolSearch}
                        className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 active:bg-indigo-700 transition-colors"
                    >
                        검색
                    </button>
                    <span className="text-sm text-slate-500">{Array.isArray(compNameData) ? compNameData.length : 0}건</span>
                </div>

                {/* result table */}
                <div className="rounded-lg shadow-sm ring-1 ring-slate-200 overflow-hidden">
                    <div className="overflow-auto max-h-[60vh]">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-indigo-600 text-white">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">symbol</th>
                                    <th className="px-4 py-2 text-left font-semibold">name</th>
                                    <th className="px-4 py-2 text-left font-semibold">currency</th>
                                    <th className="px-4 py-2 text-left font-semibold">exchangeFullName</th>
                                    <th className="px-4 py-2 text-left font-semibold">exchange</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {Array.isArray(compNameData) && compNameData.length > 0 ? (
                                    compNameData.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className="even:bg-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors"
                                            onClick={() => compValueCal(row)}
                                        >
                                            <td className="px-4 py-2 whitespace-nowrap font-medium">{row.symbol}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.name}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.currency}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.exchangeFullName}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.exchange}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                                            검색 결과가 없습니다. 상단 입력창에 키워드를 입력하고 <span className="font-medium">Enter</span> 를 눌러보세요.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* center : fixed, popup */}
            {showPopup && (
                <>
                    {/* 배경 오버레이 */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowPopup(false)}
                    />

                    {/* 팝업 컨테이너 */}
                    <div
                        ref={popupRef}
                        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl rounded-md max-h-[80vh] w-[min(900px,90vw)] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 헤더 */}
                        <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white">
                            <h2 className="text-lg font-semibold">기업가치 계산 결과</h2>
                            <button
                                className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
                                onClick={() => setShowPopup(false)}
                            >
                                닫기 (Esc)
                            </button>
                        </div>

                        {/* 내용: compValueData 보여주기 (임시 텍스트 포함) */}
                        <div className="p-4 space-y-4">
                            {compValueData && Object.keys(compValueData).length > 0 ? (
                                <>
                                    {/* Summary */}
                                    {(() => {
                                        const v = compValueData || {};
                                        const symbol = getValDeep(v, ['symbol', 'ticker', 'code', '주식코드', '주식심볼', '기업심볼']);
                                        const name = getValDeep(v, ['companyName', 'name', 'company', '기업명']);
                                        const price = getValDeep(v, ['currentPrice', 'price', 'close', '현재가격', '현재가', '종가']);
                                        const target = getValDeep(v, ['fairValue', 'perValue', 'estimatedValue', 'targetPrice', '적정가', '주당가치', '적정가(추정)']);
                                        const per = getValDeep(v, ['per', 'PER', 'pe', 'peRatio', '성장률보정PER']);
                                        const eps = getValDeep(v, ['epsTtm', 'epsTTM', 'eps', 'EPS', 'EPS(TTM)']);
                                        const upside = (price != null && target != null) ? (toNumber(target) / toNumber(price) - 1) : null;

                                        return (
                                            <div className="flex flex-wrap items-end justify-between gap-3">
                                                <div>
                                                    <div className="text-sm text-slate-500">{symbol ? `${symbol}` : ''}</div>
                                                    <div className="text-xl font-semibold text-slate-800">{name || '결과 요약'}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {(() => {
                                                        const perNum = toNumber(per);
                                                        const epsNum = toNumber(eps);
                                                        const showPer = !Number.isNaN(perNum);
                                                        const showEps = !Number.isNaN(epsNum);
                                                        return (
                                                            <>
                                                                {showPer && (
                                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50">
                                                                        PER {fmtNum(per)}
                                                                    </span>
                                                                )}
                                                                {showEps && (
                                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50">
                                                                        EPS(TTM) {fmtNum(eps)}
                                                                    </span>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Highlight cards */}
                                    {(() => {
                                        const v = compValueData || {};
                                        const price = getValDeep(v, ['currentPrice', 'price', 'close', '현재가격', '현재가', '종가']);
                                        const target = getValDeep(v, ['fairValue', 'perValue', 'estimatedValue', 'targetPrice', '적정가', '주당가치', '적정가(추정)']);
                                        const upside = (price != null && target != null) ? (toNumber(target) / toNumber(price) - 1) : null;

                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="rounded-lg border bg-white p-4 shadow-sm">
                                                    <div className="text-xs text-slate-500">현재가</div>
                                                    <div className="mt-1 text-lg font-semibold">{fmtUsd(price)}</div>
                                                </div>
                                                <div className="rounded-lg border bg-white p-4 shadow-sm">
                                                    <div className="text-xs text-slate-500">적정가(추정)</div>
                                                    <div className="mt-1 text-lg font-semibold">{fmtUsd(target)}</div>
                                                </div>
                                                <div className="rounded-lg border bg-white p-4 shadow-sm">
                                                    <div className="text-xs text-slate-500">상승여력</div>
                                                    <div className={`mt-1 text-lg font-semibold ${upside != null && upside < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {upside == null ? '-' : fmtPct(upside)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Key-Value grid (compact) */}
                                    <div className="rounded-lg border bg-white p-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                                            {Object.entries(compValueData).map(([k, v]) => (
                                                <div key={k} className="flex items-start justify-between gap-3 border-b last:border-b-0 py-1">
                                                    <div className="text-slate-500 whitespace-nowrap">{k}</div>
                                                    <div className="text-right break-all font-medium max-w-[60%]">
                                                        {Array.isArray(v) ? (
                                                            <details className="text-left inline-block">
                                                                <summary className="cursor-pointer text-slate-600">[{v.length}] 배열</summary>
                                                                <pre className="mt-1 p-2 bg-slate-50 rounded text-xs whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
                                                            </details>
                                                        ) : (typeof v === 'object' && v !== null) ? (
                                                            <details className="text-left inline-block max-w-[min(90vw,900px)]">
                                                                <summary className="cursor-pointer text-slate-600 select-none">객체 펼치기</summary>
                                                                <div className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-auto max-h-[55vh]">
                                                                    <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                                                                        {Object.entries(v).map(([kk, vv]) => (
                                                                            <div key={kk} className="rounded border border-slate-200 bg-white px-2.5 py-2">
                                                                                <div className="text-[11px] text-slate-500 mb-1 truncate" title={kk}>{kk}</div>
                                                                                <div className="text-[12px] font-mono tabular-nums break-words whitespace-pre-wrap">
                                                                                    {Array.isArray(vv)
                                                                                        ? JSON.stringify(vv, null, 2)
                                                                                        : (typeof vv === 'object' && vv !== null)
                                                                                            ? JSON.stringify(vv, null, 2)
                                                                                            : (typeof vv === 'number'
                                                                                                ? fmtNum(vv, 4)
                                                                                                : (vv == null ? '-' : String(vv)))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </details>
                                                        ) : (
                                                            typeof v === 'number' ? fmtNum(v, 4) : (v == null ? '-' : String(v))
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="px-3 py-2 rounded-md border text-sm hover:bg-slate-50"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(JSON.stringify(compValueData, null, 2));
                                                    setToast('JSON이 클립보드에 복사되었습니다.');
                                                } catch {
                                                    setToast('복사에 실패했습니다.');
                                                }
                                            }}
                                        >JSON 복사</button>
                                        <button
                                            className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
                                            onClick={() => setShowPopup(false)}
                                        >닫기</button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-gray-600">표시할 데이터가 없습니다.</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {toast && (
                <div className="fixed bottom-4 right-4 z-[60] rounded-md bg-slate-900 text-white text-sm px-4 py-2 shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}

export default AbroadCompValue;