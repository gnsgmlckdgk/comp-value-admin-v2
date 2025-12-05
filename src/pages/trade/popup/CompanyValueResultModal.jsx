import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import StockChartModal from './StockChartModal';

/**
 * 기업가치 계산 결과 모달 컴포넌트
 */
const CompanyValueResultModal = ({ isOpen, onClose, data }) => {
    const popupRef = useRef(null);
    const [toast, setToast] = useState(null);
    const [overlays, setOverlays] = useState({
        guide: false,
        detail: false,
        chart: false
    });
    const [detailView, setDetailView] = useState({
        title: '',
        data: null
    });

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 1800);
        return () => clearTimeout(timer);
    }, [toast]);

    // ESC key handler
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key !== 'Escape') return;

            if (overlays.chart) {
                setOverlays(prev => ({ ...prev, chart: false }));
            } else if (overlays.detail) {
                setOverlays(prev => ({ ...prev, detail: false }));
            } else if (overlays.guide) {
                setOverlays(prev => ({ ...prev, guide: false }));
            } else {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, overlays, onClose]);

    // 클립보드 복사 핸들러
    const handleCopyToClipboard = useCallback(async (content, successMessage) => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
            setToast(successMessage);
        } catch {
            setToast('복사에 실패했습니다.');
        }
    }, []);

    // 상세보기 열기
    const openDetailView = useCallback((title, data) => {
        setDetailView({ title, data });
        setOverlays(prev => ({ ...prev, detail: true }));
    }, []);

    // 오버레이 닫기
    const closeOverlay = useCallback((overlayName) => {
        setOverlays(prev => ({ ...prev, [overlayName]: false }));
    }, []);

    if (!isOpen) return null;

    // 심볼과 회사명 추출
    const getValDeep = (obj, keys) => {
        if (!obj || typeof obj !== 'object') return undefined;
        for (const key of keys) {
            if (obj[key] != null) return obj[key];
        }
        return undefined;
    };
    const symbol = getValDeep(data, ['symbol', 'ticker', 'code', '주식코드', '주식심볼', '기업심볼']);
    const companyName = getValDeep(data, ['companyName', 'name', 'company', '기업명']);

    return (
        <>
            {/* 배경 오버레이 */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* 메인 모달 */}
            <div
                ref={popupRef}
                className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl rounded-md max-h-[80vh] w-[min(900px,90vw)] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <ModalHeader onClose={onClose} />
                <ModalContent
                    data={data}
                    onCopy={handleCopyToClipboard}
                    onClose={onClose}
                    onOpenGuide={() => setOverlays(prev => ({ ...prev, guide: true }))}
                    onOpenDetail={openDetailView}
                    onOpenChart={() => setOverlays(prev => ({ ...prev, chart: true }))}
                />
            </div>

            {/* 해석 가이드 오버레이 */}
            {overlays.guide && (
                <GuideOverlay onClose={() => closeOverlay('guide')} />
            )}

            {/* 상세보기 오버레이 */}
            {overlays.detail && (
                <DetailOverlay
                    title={detailView.title}
                    data={detailView.data}
                    onClose={() => closeOverlay('detail')}
                    onCopy={handleCopyToClipboard}
                />
            )}

            {/* 차트 모달 */}
            <StockChartModal
                isOpen={overlays.chart}
                onClose={() => closeOverlay('chart')}
                symbol={symbol}
                companyName={companyName}
            />

            {/* Toast 알림 */}
            {toast && <Toast message={toast} />}
        </>
    );
};

/**
 * 모달 헤더
 */
const ModalHeader = ({ onClose }) => (
    <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white z-10">
        <h2 className="text-lg font-semibold">기업가치 계산 결과</h2>
        <button
            className="text-sm px-2 py-1 border rounded hover:bg-gray-50 transition-colors"
            onClick={onClose}
        >
            닫기 (Esc)
        </button>
    </div>
);

/**
 * 모달 메인 콘텐츠
 */
const ModalContent = ({ data, onCopy, onClose, onOpenGuide, onOpenDetail, onOpenChart }) => {
    const compValueData = data || {};
    const hasData = Object.keys(compValueData).length > 0;

    if (!hasData) {
        return (
            <div className="p-4">
                <p className="text-sm text-gray-600">표시할 데이터가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <CompanySummary data={compValueData} />
            <PEGExplanation onOpenGuide={onOpenGuide} />
            <RecommendationBanner data={compValueData} />
            <HighlightCards data={compValueData} />
            <DataGrid data={compValueData} onOpenDetail={onOpenDetail} />
            <ActionButtons
                data={compValueData}
                onCopy={onCopy}
                onClose={onClose}
                onOpenChart={onOpenChart}
            />
        </div>
    );
};

/**
 * 기업 요약 정보
 */
const CompanySummary = ({ data }) => {
    const metrics = useCompanyMetrics(data);

    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <div className="text-sm text-slate-500">{metrics.symbol || ''}</div>
                <div className="text-xl font-semibold text-slate-800">{metrics.name || '결과 요약'}</div>
            </div>
            <MetricBadges metrics={metrics} data={data} />
        </div>
    );
};

/**
 * 지표 배지들
 */
const MetricBadges = ({ metrics, data }) => {
    const { per, perAdj, peg, eps, isRecommended } = metrics;

    return (
        <div className="flex gap-2 flex-wrap">
            {per !== null && (
                <Badge title="Price / Earnings">
                    PER {formatNumber(per)}
                </Badge>
            )}
            {perAdj !== null && (
                <Badge title="성장률 보정 PER">
                    성장률 보정 PER {formatNumber(perAdj)}
                </Badge>
            )}
            {peg !== null && (
                <Badge
                    title="Price / Earnings to Growth (PEG)"
                    highlighted={isRecommended}
                >
                    PEG {formatNumber(peg, 2)}
                    {isRecommended && (
                        <span className="ml-1 text-[11px] text-emerald-600">(투자 권장)</span>
                    )}
                </Badge>
            )}
            {eps !== null && (
                <Badge>
                    EPS(TTM) {formatNumber(eps)}
                </Badge>
            )}
        </div>
    );
};

/**
 * 배지 컴포넌트
 */
const Badge = ({ children, title, highlighted = false }) => (
    <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${highlighted
                ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                : 'text-slate-700 bg-slate-50'
            }`}
        title={title}
    >
        {children}
    </span>
);

/**
 * PEG 설명 섹션
 */
const PEGExplanation = ({ onOpenGuide }) => (
    <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[12px] text-slate-500">
            💡 PEG = PER ÷ 이익성장률(%) — PEG가 1 이하이면 성장 대비 저평가, 1 이상이면 고평가 가능
        </p>
        <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            title="해석 요약 보기"
        >
            <InfoIcon />
            해석 요약
        </button>
    </div>
);

/**
 * 투자 권장 배너
 */
const RecommendationBanner = ({ data }) => {
    const metrics = useCompanyMetrics(data);

    if (!metrics.isRecommended) return null;

    return (
        <div className="mt-2 w-full rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
            📈 조건 충족: PEG ≤ 1 이고 적정가 &gt; 현재가 — <span className="font-semibold">투자 권장</span>
        </div>
    );
};

/**
 * 하이라이트 카드들
 */
const HighlightCards = ({ data }) => {
    const { price, target, upside } = usePriceMetrics(data);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard label="현재가" value={formatUSD(price)} />
            <MetricCard label="적정가(추정)" value={formatUSD(target)} />
            <MetricCard
                label="상승여력"
                value={upside === null ? '-' : formatPercent(upside)}
                valueClassName={upside !== null && upside < 0 ? 'text-red-600' : 'text-emerald-600'}
            />
        </div>
    );
};

/**
 * 지표 카드
 */
const MetricCard = ({ label, value, valueClassName = '' }) => (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`mt-1 text-lg font-semibold ${valueClassName}`}>{value}</div>
    </div>
);

/**
 * 데이터 그리드
 */
const DataGrid = ({ data, onOpenDetail }) => (
    <div className="rounded-lg border bg-white p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
            {Object.entries(data).map(([key, value]) => (
                <DataRow
                    key={key}
                    label={key}
                    value={value}
                    onOpenDetail={onOpenDetail}
                />
            ))}
        </div>
    </div>
);

/**
 * 데이터 행
 */
const DataRow = ({ label, value, onOpenDetail }) => (
    <div className="flex items-start justify-between gap-3 border-b last:border-b-0 py-1">
        <div className="text-slate-500 whitespace-nowrap">{label}</div>
        <div className="text-right break-all font-medium max-w-[60%]">
            {renderValue(value, label, onOpenDetail)}
        </div>
    </div>
);

/**
 * 값 렌더링
 */
const renderValue = (value, label, onOpenDetail) => {
    if (Array.isArray(value)) {
        return (
            <details className="inline-block float-right text-right">
                <summary className="cursor-pointer text-slate-600">[{value.length}] 배열</summary>
                <pre className="mt-1 p-2 bg-slate-50 rounded text-xs whitespace-pre-wrap">
                    {JSON.stringify(value, null, 2)}
                </pre>
            </details>
        );
    }

    if (typeof value === 'object' && value !== null) {
        return (
            <button
                type="button"
                className="inline-block float-right text-slate-600 underline text-xs hover:text-indigo-600 transition-colors"
                onClick={() => onOpenDetail(label, value)}
            >
                자세히 보기
            </button>
        );
    }

    if (typeof value === 'number') {
        return formatNumber(value, 4);
    }

    return value == null ? '-' : String(value);
};

/**
 * 액션 버튼들
 */
const ActionButtons = ({ data, onCopy, onClose, onOpenChart }) => (
    <div className="flex justify-between items-center gap-2">
        <button
            className="px-3 py-2 rounded-md border text-sm hover:bg-blue-50 transition-colors flex items-center gap-1.5 text-blue-600 border-blue-300"
            onClick={onOpenChart}
            title="주식 가격 및 거래량 차트 보기"
        >
            <ChartIcon />
            차트 보기
        </button>
        <div className="flex gap-2">
            <button
                className="px-3 py-2 rounded-md border text-sm hover:bg-slate-50 transition-colors"
                onClick={() => onCopy(data, 'JSON이 클립보드에 복사되었습니다.')}
            >
                JSON 복사
            </button>
            <button
                className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
                onClick={onClose}
            >
                닫기
            </button>
        </div>
    </div>
);

/**
 * 해석 가이드 오버레이
 */
const GuideOverlay = ({ onClose }) => (
    <>
        <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose} />
        <div
            className="fixed z-[80] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,calc(100vw-24px))] max-h-[85vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-2.5">
                <div className="text-sm font-semibold text-slate-800">📈 해석 요약</div>
                <button
                    className="text-xs rounded border px-2 py-1 hover:bg-slate-50 transition-colors"
                    onClick={onClose}
                >
                    닫기 (Esc)
                </button>
            </div>

            <div className="px-4 pt-3 pb-4 text-[12px] text-slate-600">
                PEG(↓: 저평가, ↑: 고평가)와 적정가(↑/↓) 조합으로 간단한 해석 매트릭스입니다.
            </div>

            <div className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <GuideCard
                        color="emerald"
                        title="적정가↑ / PEG↓"
                        description="성장 대비 저평가 (투자유효)"
                    />
                    <GuideCard
                        color="amber"
                        title="적정가↑ / PEG↑"
                        description="성장성 반영된 고평가 (관망)"
                    />
                    <GuideCard
                        color="rose"
                        title="적정가↓ / PEG↑"
                        description="성장둔화 + 고평가 (주의)"
                    />
                    <GuideCard
                        color="slate"
                        title="적정가↓ / PEG↓"
                        description="성장정체지만 밸류 낮음 (저PER 반등 가능)"
                    />
                </div>
            </div>
        </div>
    </>
);

/**
 * 가이드 카드
 */
const GuideCard = ({ color, title, description }) => (
    <div className={`rounded-md border border-${color}-200 bg-${color}-50 p-3`}>
        <div className={`mb-1 text-[11px] font-semibold text-${color}-700`}>{title}</div>
        <div className={`text-[12px] text-${color}-800`}>{description}</div>
    </div>
);

/**
 * 상세보기 오버레이
 */
const DetailOverlay = ({ title, data, onClose, onCopy }) => (
    <>
        <div className="fixed inset-0 z-[75] bg-black/50" onClick={onClose} />
        <div
            className="fixed z-[85] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(900px,calc(100vw-24px))] max-h-[85vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-2.5">
                <div className="text-sm font-semibold text-slate-800">🔎 {title || '상세보기'}</div>
                <div className="flex items-center gap-2">
                    <button
                        className="text-xs rounded border px-2 py-1 hover:bg-slate-50 transition-colors"
                        onClick={() => onCopy(data, '상세 JSON이 복사되었습니다.')}
                    >
                        JSON 복사
                    </button>
                    <button
                        className="text-xs rounded border px-2 py-1 hover:bg-slate-50 transition-colors"
                        onClick={onClose}
                    >
                        닫기 (Esc)
                    </button>
                </div>
            </div>

            <div className="p-3">
                {data && typeof data === 'object' ? (
                    <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                        {Object.entries(data).map(([key, value]) => (
                            <DetailCard key={key} label={key} value={value} />
                        ))}
                    </div>
                ) : (
                    <pre className="text-xs">{String(data)}</pre>
                )}
            </div>
        </div>
    </>
);

/**
 * 상세 카드
 */
const DetailCard = ({ label, value }) => (
    <div className="rounded border border-slate-200 bg-white px-2.5 py-2">
        <div className="text-[11px] text-slate-500 mb-1 truncate" title={label}>
            {label}
        </div>
        <div className="text-[12px] font-mono tabular-nums break-words whitespace-pre-wrap">
            {formatDetailValue(value)}
        </div>
    </div>
);

/**
 * Toast 컴포넌트
 */
const Toast = ({ message }) => (
    <div className="fixed bottom-4 right-4 z-[60] rounded-md bg-slate-900 text-white text-sm px-4 py-2 shadow-lg animate-fade-in">
        {message}
    </div>
);

/**
 * Info 아이콘
 */
const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-.75 6a.75.75 0 0 1 1.5 0v.008a.75.75 0 0 1-1.5 0V8.25Zm0 3a.75.75 0 0 1 1.5 0v5.25a.75.75 0 0 1-1.5 0V11.25Z" clipRule="evenodd" />
    </svg>
);

/**
 * Chart 아이콘
 */
const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z" />
    </svg>
);

// ============ Custom Hooks ============

/**
 * 기업 지표 계산 Hook
 */
const useCompanyMetrics = (data) => {
    return useMemo(() => {
        const getValDeep = (obj, keys) => {
            if (!obj || typeof obj !== 'object') return undefined;

            for (const key of keys) {
                if (obj[key] != null) return obj[key];
            }

            const containers = ['상세', '상세정보', 'detail', 'details', 'metric', 'metrics', 'valuation', 'summary', 'data'];
            for (const container of containers) {
                if (obj[container] && typeof obj[container] === 'object') {
                    const found = getValDeep(obj[container], keys);
                    if (found !== undefined) return found;
                }
            }

            return undefined;
        };

        const toNum = (v) => {
            if (v == null) return NaN;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
                const cleaned = v.replace(/[,%\s]/g, '');
                const num = Number(cleaned);
                return Number.isNaN(num) ? NaN : num;
            }
            return NaN;
        };

        const symbol = getValDeep(data, ['symbol', 'ticker', 'code', '주식코드', '주식심볼', '기업심볼']);
        const name = getValDeep(data, ['companyName', 'name', 'company', '기업명']);
        const price = getValDeep(data, ['currentPrice', 'price', 'close', '현재가격', '현재가', '종가']);
        const target = getValDeep(data, ['fairValue', 'perValue', 'estimatedValue', 'targetPrice', '적정가', '주당가치', '적정가(추정)']);
        const per = getValDeep(data, ['per', 'PER', 'pe', 'peRatio', 'perTTM', 'PER(TTM)']);
        const perAdj = getValDeep(data, ['성장률보정PER', 'growthAdjustedPER', 'perGrowthAdjusted']);
        const pegBackend = getValDeep(data, ['PEG', 'peg', 'pegRatio', 'pegTTM', '성장률보정PEG']);
        const eps = getValDeep(data, ['epsTtm', 'epsTTM', 'eps', 'EPS', 'EPS(TTM)']);

        const perNum = toNum(per);
        const pegBackendNum = toNum(pegBackend);

        const growthRaw = getValDeep(data, [
            'growthRate', '이익성장률', 'growth', 'growthPct', 'growthPercent', 'growthPercentage',
            'epsGrowth', 'epsGrowthRate', 'earningsGrowth', 'ttmEpsGrowth', 'forwardEarningsGrowth',
            'nextYearGrowth', 'profitGrowth', 'netIncomeGrowth'
        ]);
        const gNum = toNum(growthRaw);
        const growthPct = Number.isNaN(gNum) ? NaN : Math.abs(gNum > 1 ? gNum : gNum * 100);
        const pegCalc = (!Number.isNaN(perNum) && !Number.isNaN(growthPct) && growthPct !== 0)
            ? perNum / growthPct
            : NaN;

        const pegToShow = !Number.isNaN(pegBackendNum) ? pegBackendNum : pegCalc;
        const priceNum = toNum(price);
        const targetNum = toNum(target);
        const isRecommended = Number.isFinite(pegToShow) && pegToShow <= 1 &&
            !Number.isNaN(priceNum) && !Number.isNaN(targetNum) &&
            targetNum > priceNum;

        return {
            symbol,
            name,
            per: Number.isNaN(perNum) ? null : perNum,
            perAdj: Number.isNaN(toNum(perAdj)) ? null : toNum(perAdj),
            peg: Number.isFinite(pegToShow) ? pegToShow : null,
            eps: Number.isNaN(toNum(eps)) ? null : toNum(eps),
            isRecommended
        };
    }, [data]);
};

/**
 * 가격 지표 계산 Hook
 */
const usePriceMetrics = (data) => {
    return useMemo(() => {
        const getValDeep = (obj, keys) => {
            if (!obj || typeof obj !== 'object') return undefined;
            for (const key of keys) {
                if (obj[key] != null) return obj[key];
            }
            return undefined;
        };

        const toNum = (v) => {
            if (v == null) return NaN;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
                const cleaned = v.replace(/[,%\s]/g, '');
                return Number(cleaned);
            }
            return NaN;
        };

        const price = getValDeep(data, ['currentPrice', 'price', 'close', '현재가격', '현재가', '종가']);
        const target = getValDeep(data, ['fairValue', 'perValue', 'estimatedValue', 'targetPrice', '적정가', '주당가치', '적정가(추정)']);

        const priceNum = toNum(price);
        const targetNum = toNum(target);
        const upside = (!Number.isNaN(priceNum) && !Number.isNaN(targetNum))
            ? (targetNum / priceNum - 1)
            : null;

        return { price, target, upside };
    }, [data]);
};

// ============ Utility Functions ============

const toNumber = (v) => {
    if (v == null) return NaN;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        const s = v.replace(/[,%\s]/g, '');
        return Number(s);
    }
    return NaN;
};

const formatNumber = (v, digits = 2) => {
    const n = toNumber(v);
    if (Number.isNaN(n)) return '-';
    try {
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n);
    } catch {
        return String(v);
    }
};

const formatUSD = (v, digits = 2) => (v == null ? '-' : `$${formatNumber(v, digits)}`);

const formatPercent = (ratio, digits = 1) => {
    const n = toNumber(ratio);
    return Number.isNaN(n) ? '-' : `${(n * 100).toFixed(digits)}%`;
};

const formatDetailValue = (value) => {
    if (Array.isArray(value)) {
        return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'number') {
        return formatNumber(value, 4);
    }
    return value == null ? '-' : String(value);
};

export default CompanyValueResultModal;