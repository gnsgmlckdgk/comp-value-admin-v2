import Loading from '@/component/common/display/Loading';
import { useState, useEffect, useRef } from 'react'

import BulkQueryModal from '@/pages/trade/popup/BulkQueryModal';
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

    const [showGuide, setShowGuide] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showBulk, setShowBulk] = useState(false);

    const [detailTitle, setDetailTitle] = useState('');
    const [detailData, setDetailData] = useState(null);


    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1800);
        return () => clearTimeout(t);
    }, [toast]);

    // ESC key: close the topmost layer only (detail > guide > popup)
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (showDetail) { setShowDetail(false); return; }
            if (showGuide) { setShowGuide(false); return; }
            if (showPopup) { setShowPopup(false); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showPopup, showGuide, showDetail]);

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

    // Deep search for keys across arbitrarily nested objects (guards against cycles).
    const getValDeep = (obj, keys, seen = new Set()) => {
        if (!obj || typeof obj !== 'object') return undefined;
        if (seen.has(obj)) return undefined;
        seen.add(obj);

        // 1) check at current level
        const direct = getVal(obj, keys);
        if (direct !== undefined) return direct;

        // 2) prefer common containers if present (fast path)
        const containers = ['상세', '상세정보', 'detail', 'details', 'metric', 'metrics', 'valuation', 'summary', 'data'];
        for (const c of containers) {
            const v = obj[c];
            if (v && typeof v === 'object') {
                const found = getValDeep(v, keys, seen);
                if (found !== undefined) return found;
            }
        }

        // 3) fallback: recurse into all nested plain objects
        for (const [, v] of Object.entries(obj)) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                const found = getValDeep(v, keys, seen);
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

        const sendUrl = `/dart/abroad/company/search/symbol?cn=${compName}&symbol=${compName}`;
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
                        placeholder="심볼 및 회사명으로 검색 (Enter)"
                        className="w-[min(520px,90vw)] px-3 py-2 rounded-md border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                        onClick={compSymbolSearch}
                        className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 active:bg-indigo-700 transition-colors"
                    >
                        검색
                    </button>
                    <button
                        onClick={() => setShowBulk(true)}
                        className="px-3 py-2 rounded-md border text-sm font-medium hover:bg-slate-50"
                    >
                        대량 조회
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
                                        const per = getValDeep(v, ['per', 'PER', 'pe', 'peRatio', 'perTTM', 'PER(TTM)']);
                                        // 성장률 보정 PER 은 PEG 와 다른 값이므로 peg 키는 제외
                                        const perAdj = getValDeep(v, ['성장률보정PER', 'growthAdjustedPER', 'perGrowthAdjusted']);
                                        // 백엔드에서 계산/전달되는 PEG 값을 우선 사용 (없으면 프론트에서 계산)
                                        const pegBackend = getValDeep(v, ['PEG', 'peg', 'pegRatio', 'pegTTM', '성장률보정PEG']);
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
                                                        const perAdjNum = toNumber(perAdj);
                                                        const epsNum = toNumber(eps);
                                                        const showPer = !Number.isNaN(perNum);
                                                        const showPerAdj = !Number.isNaN(perAdjNum);
                                                        const showEps = !Number.isNaN(epsNum);

                                                        // 1) 백엔드 PEG 우선
                                                        const pegBackendNum = toNumber(pegBackend);

                                                        // 2) 프론트 계산 PEG (백업)
                                                        // PEG = PER ÷ 이익성장률(%) — growth can come as 0.12 or 12, normalize to %
                                                        const growthRaw = getValDeep(v, [
                                                            'growthRate', '이익성장률', 'growth', 'growthPct', 'growthPercent', 'growthPercentage',
                                                            'epsGrowth', 'epsGrowthRate', 'earningsGrowth', 'ttmEpsGrowth', 'forwardEarningsGrowth',
                                                            'nextYearGrowth', 'profitGrowth', 'netIncomeGrowth'
                                                        ]);
                                                        const gNum = toNumber(growthRaw);
                                                        // normalize: 0.12 => 12, 12 => 12 (abs 로 음수 방지)
                                                        const growthPct = Number.isNaN(gNum) ? NaN : Math.abs(gNum > 1 ? gNum : gNum * 100);
                                                        const pegCalc = (!Number.isNaN(perNum) && !Number.isNaN(growthPct) && growthPct !== 0)
                                                            ? perNum / growthPct
                                                            : NaN;

                                                        const pegToShow = !Number.isNaN(pegBackendNum) ? pegBackendNum : pegCalc;
                                                        const showPeg = Number.isFinite(pegToShow);

                                                        return (
                                                            <>
                                                                {showPer && (
                                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50" title="Price / Earnings">
                                                                        PER {fmtNum(per)}
                                                                    </span>
                                                                )}
                                                                {showPerAdj && (
                                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50" title="성장률 보정 PER">
                                                                        성장률 보정 PER {fmtNum(perAdj)}
                                                                    </span>
                                                                )}
                                                                {showPeg && (
                                                                    // price/target for recommendation
                                                                    (() => {
                                                                        const price = getValDeep(v, ['currentPrice', 'price', 'close', '현재가격', '현재가', '종가']);
                                                                        const target = getValDeep(v, ['fairValue', 'perValue', 'estimatedValue', 'targetPrice', '적정가', '주당가치', '적정가(추정)']);
                                                                        const priceNum = toNumber(price);
                                                                        const targetNum = toNumber(target);
                                                                        const isRecommended = showPeg && pegToShow <= 1 && !Number.isNaN(priceNum) && !Number.isNaN(targetNum) && targetNum > priceNum;
                                                                        return (
                                                                            <span
                                                                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${isRecommended ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : 'text-slate-700 bg-slate-50'
                                                                                    }`}
                                                                                title="Price / Earnings to Growth (PEG)"
                                                                            >
                                                                                PEG {fmtNum(pegToShow, 2)}
                                                                                {isRecommended && <span className="ml-1 text-[11px] text-emerald-600">(투자 권장)</span>}
                                                                            </span>
                                                                        );
                                                                    })()
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

                                    {/* PEG 설명 + 해석 요약 버튼 */}
                                    <div className="mt-1 flex items-center justify-between">
                                        <p className="text-[12px] text-slate-500">
                                            💡 PEG = PER ÷ 이익성장률(%) — PEG가 1 이하이면 성장 대비 저평가, 1 이상이면 고평가 가능
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setShowGuide(true)}
                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 hover:bg-slate-50"
                                            title="해석 요약 보기"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-.75 6a.75.75 0 0 1 1.5 0v.008a.75.75 0 0 1-1.5 0V8.25Zm0 3a.75.75 0 0 1 1.5 0v5.25a.75.75 0 0 1-1.5 0V11.25Z" clipRule="evenodd" />
                                            </svg>
                                            해석 요약
                                        </button>
                                    </div>
                                    {/* guide overlay moved outside popup container */}

                                    {/* PEG 추천 배너 */}
                                    {(() => {
                                        // reuse the same logic for visibility; compute again safely
                                        const v = compValueData || {};
                                        const pegBackend = getValDeep(v, ['PEG', 'peg', 'pegRatio', 'pegTTM', '성장률보정PEG']);
                                        const pegBackendNum = toNumber(pegBackend);
                                        const per = getValDeep(v, ['per', 'PER', 'pe', 'peRatio', 'perTTM', 'PER(TTM)']);
                                        const perNum = toNumber(per);
                                        const growthRaw = getValDeep(v, [
                                            'growthRate', '이익성장률', 'growth', 'growthPct', 'growthPercent', 'growthPercentage',
                                            'epsGrowth', 'epsGrowthRate', 'earningsGrowth', 'ttmEpsGrowth', 'forwardEarningsGrowth',
                                            'nextYearGrowth', 'profitGrowth', 'netIncomeGrowth'
                                        ]);
                                        const gNum = toNumber(growthRaw);
                                        const growthPct = Number.isNaN(gNum) ? NaN : Math.abs(gNum > 1 ? gNum : gNum * 100);
                                        const pegCalc = (!Number.isNaN(perNum) && !Number.isNaN(growthPct) && growthPct !== 0) ? perNum / growthPct : NaN;
                                        const pegToShow = !Number.isNaN(pegBackendNum) ? pegBackendNum : pegCalc;
                                        const showPeg = Number.isFinite(pegToShow);
                                        const price = getValDeep(v, ['currentPrice', 'price', 'close', '현재가격', '현재가', '종가']);
                                        const target = getValDeep(v, ['fairValue', 'perValue', 'estimatedValue', 'targetPrice', '적정가', '주당가치', '적정가(추정)']);
                                        const priceNum = toNumber(price);
                                        const targetNum = toNumber(target);
                                        const isRecommended = showPeg && pegToShow <= 1 && !Number.isNaN(priceNum) && !Number.isNaN(targetNum) && targetNum > priceNum;
                                        return isRecommended ? (
                                            <div className="mt-2 w-full rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
                                                📈 조건 충족: PEG ≤ 1 이고 적정가 &gt; 현재가 — <span className="font-semibold">투자 권장</span>
                                            </div>
                                        ) : null;
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
                                                            <details className="inline-block float-right text-right">
                                                                <summary className="cursor-pointer text-slate-600">[{v.length}] 배열</summary>
                                                                <pre className="mt-1 p-2 bg-slate-50 rounded text-xs whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
                                                            </details>
                                                        ) : (typeof v === 'object' && v !== null) ? (
                                                            <button
                                                                type="button"
                                                                className="inline-block float-right text-slate-600 underline text-xs hover:text-indigo-600"
                                                                onClick={() => { setDetailTitle(k); setDetailData(v); setShowDetail(true); }}
                                                            >
                                                                자세히 보기
                                                            </button>
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

                    {showGuide && (
                        <>
                            {/* overlay backdrop (fullscreen) */}
                            <div
                                className="fixed inset-0 z-[70] bg-black/50"
                                onClick={() => setShowGuide(false)}
                            />

                            {/* diagram card (fullscreen, centered) */}
                            <div
                                className="fixed z-[80] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,calc(100vw-24px))] max-h-[85vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-2.5">
                                    <div className="text-sm font-semibold text-slate-800">📈 해석 요약</div>
                                    <button
                                        className="text-xs rounded border px-2 py-1 hover:bg-slate-50"
                                        onClick={() => setShowGuide(false)}
                                    >닫기 (Esc)</button>
                                </div>

                                <div className="px-4 pt-3 pb-4 text-[12px] text-slate-600">
                                    PEG(↓: 저평가, ↑: 고평가)와 적정가(↑/↓) 조합으로 간단한 해석 매트릭스입니다. 아무 곳이나 클릭하면 닫힙니다.
                                </div>

                                <div className="px-4 pb-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                                            <div className="mb-1 text-[11px] font-semibold text-emerald-700">적정가↑ / PEG↓</div>
                                            <div className="text-[12px] text-emerald-800">성장 대비 저평가 (투자유효)</div>
                                        </div>
                                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                                            <div className="mb-1 text-[11px] font-semibold text-amber-700">적정가↑ / PEG↑</div>
                                            <div className="text-[12px] text-amber-800">성장성 반영된 고평가 (관망)</div>
                                        </div>
                                        <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                                            <div className="mb-1 text-[11px] font-semibold text-rose-700">적정가↓ / PEG↑</div>
                                            <div className="text-[12px] text-rose-800">성장둔화 + 고평가 (주의)</div>
                                        </div>
                                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                            <div className="mb-1 text-[11px] font-semibold text-slate-700">적정가↓ / PEG↓</div>
                                            <div className="text-[12px] text-slate-800">성장정체지만 밸류 낮음 (저PER 반등 가능)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {showDetail && (
                        <>
                            <div className="fixed inset-0 z-[75] bg-black/50" onClick={() => setShowDetail(false)} />
                            <div
                                className="fixed z-[85] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(900px,calc(100vw-24px))] max-h-[85vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-2.5">
                                    <div className="text-sm font-semibold text-slate-800">🔎 {detailTitle || '상세보기'}</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="text-xs rounded border px-2 py-1 hover:bg-slate-50"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(JSON.stringify(detailData, null, 2));
                                                    setToast('상세 JSON이 복사되었습니다.');
                                                } catch {
                                                    setToast('복사에 실패했습니다.');
                                                }
                                            }}
                                        >JSON 복사</button>
                                        <button className="text-xs rounded border px-2 py-1 hover:bg-slate-50" onClick={() => setShowDetail(false)}>닫기 (Esc)</button>
                                    </div>
                                </div>

                                <div className="p-3">
                                    {detailData && typeof detailData === 'object' ? (
                                        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                                            {Object.entries(detailData).map(([kk, vv]) => (
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
                                    ) : (
                                        <pre className="text-xs">{String(detailData)}</pre>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {toast && (
                <div className="fixed bottom-4 right-4 z-[60] rounded-md bg-slate-900 text-white text-sm px-4 py-2 shadow-lg">
                    {toast}
                </div>
            )}

            <BulkQueryModal
                open={showBulk}
                onClose={() => setShowBulk(false)}
            />

        </div>
    );
}

export default AbroadCompValue;