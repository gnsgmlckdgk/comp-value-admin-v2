import { useState, useRef, useEffect } from 'react';
import { API_VERSION } from '@/util/ClientUtil';
import CompanyInfoModal from '@/pages/trade/popup/CompanyInfoModal';
import StockChartModal from '@/pages/trade/popup/StockChartModal';

// 숫자를 천 단위 콤마 포맷으로 변환
const formatNumberWithComma = (value) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US');
};

// 등급별 색상
const getGradeStyle = (grade) => {
    const styles = {
        'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        'A': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'B+': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'B': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
        'C+': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'C': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'F': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return styles[grade] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
};

// 필드 레이블 매핑 (영문 -> 한글)
const FIELD_LABELS = {
    symbol: '심볼',
    companyName: '기업명',
    currentPrice: '현재가',
    fairValue: '적정가치',
    calFairValue: '계산된 주당가치',
    priceDifference: '가격차이',
    priceGapPercent: '가격차이율',
    totalScore: '총점',
    grade: '등급',
    recommendation: '추천',
    peg: 'PEG',
    per: 'PER',
    sector: '섹터',
    industry: '산업군',
    beta: '베타',
    exchange: '거래소',
    country: '국가',
    marketCap: '시가총액',
    step1Score: '1단계 점수',
    step2Score: '2단계 점수',
    step3Score: '3단계 점수',
    step4Score: '4단계 점수',
};

// resultDetail 필드 레이블 매핑
const RESULT_DETAIL_LABELS = {
    '단위': '단위',
    '영업이익_전전기': '영업이익 (전전기)',
    '영업이익_전기': '영업이익 (전기)',
    '영업이익_당기': '영업이익 (당기)',
    '영업이익_합계': '영업이익 합계',
    '영업이익_평균': '영업이익 평균',
    '유동자산합계': '유동자산 합계',
    '유동부채합계': '유동부채 합계',
    '유동비율': '유동비율',
    '투자자산_비유동자산내': '투자자산 (비유동자산내)',
    '고정부채': '고정부채',
    '발행주식수': '발행주식수',
    '영업이익성장률': '영업이익 성장률',
    '성장률보정PER': '성장률 보정 PER',
    '무형자산': '무형자산',
    '연구개발비_당기': '연구개발비 (당기)',
    '연구개발비_전기': '연구개발비 (전기)',
    '연구개발비_전전기': '연구개발비 (전전기)',
    '연구개발비_평균': '연구개발비 평균',
    '총부채': '총부채',
    '현금성자산': '현금성자산',
    '순부채': '순부채',
    '계산_사업가치': '계산 - 사업가치',
    '계산_재산가치': '계산 - 재산가치',
    '계산_부채': '계산 - 부채',
    '계산_기업가치': '계산 - 기업가치',
    '예외메세지_영업이익': '예외메세지 (영업이익)',
    '예외메시지_발행주식수': '예외메세지 (발행주식수)',
    '수익가치계산불가': '수익가치 계산불가',
    '적자기업': '적자기업',
    '매출기반평가': '매출기반 평가',
    '흑자전환기업': '흑자전환 기업',
    '매출액': '매출액',
    '매출성장률': '매출 성장률',
    '매출성장률보정계수': '매출성장률 보정계수',
    'eps성장률': 'EPS 성장률',
    'per': 'PER',
    'peg': 'PEG',
    'psr': 'PSR',
    'calFairValue': '계산된 주당가치',
};

// resultDetail 값 포맷팅
const formatResultDetailValue = (key, value) => {
    if (value === null || value === undefined || value === '' || value === 'N/A') return '-';

    // boolean 값
    if (typeof value === 'boolean') {
        return value ? '예' : '아니오';
    }

    // 비율 값
    if (key.includes('성장률') || key.includes('비율') || key === 'peg' || key === 'per' || key === 'psr') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            if (key.includes('성장률')) {
                return `${(num * 100).toFixed(2)}%`;
            }
            return num.toFixed(4);
        }
    }

    // 큰 숫자 포맷
    const num = parseFloat(value);
    if (!isNaN(num) && num > 1000000) {
        return formatNumberWithComma(num);
    }

    return String(value);
};

/**
 * 하이라이트 카드 컴포넌트
 */
const HighlightCard = ({ label, value, isGrade, onClick, clickable, subValue = null, subLabel = '' }) => {
    const CardWrapper = clickable ? 'button' : 'div';
    return (
        <CardWrapper
            type={clickable ? 'button' : undefined}
            onClick={clickable ? onClick : undefined}
            className={`rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-700 dark:border-slate-600 group relative text-left w-full ${clickable
                ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/30 dark:hover:border-blue-600 transition-colors ring-0 hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800'
                : ''
                }`}
        >
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                {label}
                {clickable && (
                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3m0 0l3 3m-3-3v8m0-14a9 9 0 110 18 9 9 0 010-18z" />
                    </svg>
                )}
            </div>
            <div className={`mt-1 text-base font-semibold text-slate-900 dark:text-white truncate ${clickable ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400' : ''}`}>
                {isGrade ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-bold ${getGradeStyle(value)}`}>
                        {value || '-'}
                    </span>
                ) : (
                    <span className="flex items-center gap-1">
                        {value}
                        {clickable && (
                            <svg className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        )}
                    </span>
                )}
            </div>
            {/* 서브값 표시 */}
            {subValue && (
                <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    <span className="text-slate-500 dark:text-slate-400">{subLabel}: </span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{subValue}</span>
                </div>
            )}
            {/* 툴팁 */}
            {value && String(value).length > 15 && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-xs whitespace-normal break-all pointer-events-none">
                    {value}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                </div>
            )}
        </CardWrapper>
    );
};

/**
 * 정보 카드 컴포넌트
 */
const InfoCard = ({ label, value }) => (
    <div className="rounded-lg border bg-slate-50 p-2.5 dark:bg-slate-700 dark:border-slate-600 group relative">
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{value}</div>
        {/* 툴팁 */}
        {value && String(value).length > 20 && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-xs whitespace-normal break-all pointer-events-none">
                {value}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
            </div>
        )}
    </div>
);

/**
 * 단계별 상세 카드 컴포넌트
 */
const StepDetailCard = ({ step }) => {
    const progressPercent = (step.score / step.maxScore) * 100;

    return (
        <div className="rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-700 dark:border-slate-600">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold dark:bg-slate-600 dark:text-slate-200">
                        {step.stepNumber}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{step.stepName}</span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {step.score} / {step.maxScore}
                </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 dark:bg-slate-600">
                <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{step.description}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{step.details}</p>
        </div>
    );
};

/**
 * 투자 판단 상세 모달 컴포넌트
 */
const InvestmentDetailModal = ({ isOpen, data, onClose, onOpenFullDetail, zIndex = 50 }) => {

    const modalRef = useRef(null);
    const [companyInfoModal, setCompanyInfoModal] = useState({ open: false, symbol: null });
    const [chartModal, setChartModal] = useState({ open: false, symbol: null, companyName: null });

    // ESC 키 핸들러
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    const stepDetails = data.stepDetails || [];

    // 기업 정보 모달 열기
    const handleOpenCompanyInfo = () => {
        setCompanyInfoModal({ open: true, symbol: data.symbol });
    };

    // 차트 모달 열기
    const handleOpenChart = () => {
        setChartModal({ open: true, symbol: data.symbol, companyName: data.companyName });
    };

    return (
        <>
            {/* 배경 오버레이 */}
            <div
                className="fixed inset-0 bg-black/50 dark:bg-black/70"
                style={{ zIndex: zIndex - 10 }}
                onClick={onClose}
            />

            {/* 모달 */}
            <div
                ref={modalRef}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl rounded-lg max-h-[85vh] w-[min(800px,90vw)] overflow-hidden dark:bg-slate-800"
                style={{ zIndex }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white z-10 dark:bg-slate-800 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold dark:text-white">투자 판단 상세</h2>
                        <button
                            type="button"
                            onClick={handleOpenCompanyInfo}
                            className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors flex items-center gap-1"
                        >
                            <span>{data.symbol} - {data.companyName}</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                            계산 버전: {API_VERSION.ABROAD_COMP_VALUE_LAST_VER}
                        </span>
                        {onOpenFullDetail && (
                            <button
                                type="button"
                                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                                onClick={() => onOpenFullDetail(data)}
                            >
                                자세히 보기
                            </button>
                        )}
                        <button
                            className="text-sm px-2 py-1 border rounded hover:bg-gray-50 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            onClick={onClose}
                        >
                            닫기 (Esc)
                        </button>
                    </div>
                </div>

                {/* 콘텐츠 */}
                <div className="p-4 overflow-y-auto max-h-[calc(85vh-60px)]">
                    {/* 요약 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <HighlightCard label="등급" value={data.grade} isGrade />
                        <HighlightCard label="총점" value={`${data.totalScore?.toFixed(1) ?? '-'} / 100`} />
                        <HighlightCard
                            label="현재가"
                            value={data.currentPrice ? `$${data.currentPrice}` : '-'}
                            onClick={data.currentPrice ? handleOpenChart : null}
                            clickable={!!data.currentPrice}
                        />
                        <HighlightCard
                            label="적정가치"
                            value={data.fairValue ? `$${data.fairValue}` : '-'}
                            subValue={(() => {
                                const calculated = data.calFairValue;
                                if (calculated != null) {
                                    const calcNum = parseFloat(calculated);
                                    const fairNum = parseFloat(data.fairValue);
                                    if (!isNaN(calcNum) && (isNaN(fairNum) || Math.abs(calcNum - fairNum) > 0.01)) {
                                        return `$${calculated}`;
                                    }
                                }
                                return null;
                            })()}
                            subLabel="계산된 주당가치"
                        />
                    </div>

                    {/* 추천 */}
                    <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                        <div className="text-sm font-medium text-blue-800 dark:text-blue-200">{data.recommendation || '-'}</div>
                    </div>

                    {/* 가격 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <InfoCard label="가격차이" value={data.priceDifference ? `$${data.priceDifference}` : '-'} />
                        <InfoCard label="가격차이율" value={data.priceGapPercent || '-'} />
                        <InfoCard label="PER" value={data.per ? parseFloat(data.per).toFixed(2) : '-'} />
                        <InfoCard label="PEG" value={data.peg || '-'} />
                    </div>

                    {/* 기업 정보 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <InfoCard label="섹터" value={data.sector || '-'} />
                        <InfoCard label="산업군" value={data.industry || '-'} />
                        <InfoCard label="거래소" value={data.exchange || '-'} />
                        <InfoCard label="시가총액" value={data.marketCap || '-'} />
                    </div>

                    {/* 단계별 점수 */}
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">단계별 평가</h4>
                        <div className="space-y-3">
                            {stepDetails.map((step) => (
                                <StepDetailCard key={step.stepNumber} step={step} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 기업 정보 모달 */}
            <CompanyInfoModal
                isOpen={companyInfoModal.open}
                onClose={() => setCompanyInfoModal({ open: false, symbol: null })}
                symbol={companyInfoModal.symbol}
                zIndex={zIndex + 100}
            />

            {/* 차트 모달 */}
            <StockChartModal
                isOpen={chartModal.open}
                onClose={() => setChartModal({ open: false, symbol: null, companyName: null })}
                symbol={chartModal.symbol}
                companyName={chartModal.companyName}
                zIndex={zIndex + 100}
            />
        </>
    );
};

/**
 * 전체 상세정보 모달 컴포넌트
 */
export const FullDetailModal = ({ isOpen, data, onClose, zIndex = 70 }) => {
    const modalRef = useRef(null);

    // ESC 키 핸들러
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !data) return null;

    const resultDetail = data.resultDetail || {};

    return (
        <>
            {/* 배경 오버레이 */}
            <div
                className="fixed inset-0 bg-black/50 dark:bg-black/70"
                style={{ zIndex: zIndex - 10 }}
                onClick={onClose}
            />

            {/* 모달 */}
            <div
                ref={modalRef}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl rounded-lg max-h-[90vh] w-[min(900px,95vw)] overflow-hidden dark:bg-slate-800"
                style={{ zIndex }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white z-10 dark:bg-slate-800 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-semibold dark:text-white">전체 응답 데이터</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {data.symbol} - {data.companyName}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                            계산 버전: {API_VERSION.ABROAD_COMP_VALUE_LAST_VER}
                        </span>
                        <button
                            className="text-sm px-2 py-1 border rounded hover:bg-gray-50 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            onClick={onClose}
                        >
                            닫기 (Esc)
                        </button>
                    </div>
                </div>

                {/* 콘텐츠 */}
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
                    {/* 기본 정보 */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            기본 정보
                        </h4>
                        <div className="rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600 p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[13px]">
                                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                                    if (key.startsWith('step') || !data.hasOwnProperty(key)) return null;
                                    const value = data[key];
                                    const displayValue = value ?? '-';
                                    const valueStr = String(displayValue);

                                    // 적정가치인 경우 계산된주당가치도 함께 표시
                                    const calculatedValue = key === 'fairValue' ? data.calFairValue : null;
                                    const showCalculated = (() => {
                                        if (calculatedValue == null) return false;
                                        const calcNum = parseFloat(calculatedValue);
                                        const fairNum = parseFloat(value);
                                        return !isNaN(calcNum) && (isNaN(fairNum) || Math.abs(calcNum - fairNum) > 0.01);
                                    })();

                                    return (
                                        <div
                                            key={key}
                                            className="flex items-start justify-between gap-3 border-b last:border-b-0 py-1.5 dark:border-slate-600 group relative"
                                        >
                                            <div className="text-slate-500 whitespace-nowrap dark:text-slate-400">
                                                {label}
                                            </div>
                                            <div className="text-right font-medium dark:text-slate-200 max-w-[150px]">
                                                <div className="truncate" title={valueStr}>{displayValue}</div>
                                                {showCalculated && (
                                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                        계산값: ${calculatedValue}
                                                    </div>
                                                )}
                                            </div>
                                            {valueStr.length > 20 && (
                                                <div className="absolute right-0 bottom-full mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-[280px] whitespace-normal break-all pointer-events-none">
                                                    {valueStr}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 단계별 점수 */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            단계별 점수
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <InfoCard label="1단계 (위험신호)" value={`${data.step1Score ?? '-'} / 20`} />
                            <InfoCard label="2단계 (신뢰도)" value={`${data.step2Score ?? '-'} / 25`} />
                            <InfoCard label="3단계 (밸류에이션)" value={`${data.step3Score ?? '-'} / 40`} />
                            <InfoCard label="4단계 (영업이익추세)" value={`${data.step4Score ?? '-'} / 15`} />
                        </div>
                    </div>

                    {/* 결과 상세 (resultDetail) */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            결과 상세 (resultDetail)
                        </h4>
                        <div className="rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600 p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[13px]">
                                {Object.entries(resultDetail).map(([key, value]) => {
                                    const formattedValue = formatResultDetailValue(key, value);
                                    const valueStr = String(formattedValue);
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-start justify-between gap-3 border-b last:border-b-0 py-1.5 dark:border-slate-600 group relative"
                                        >
                                            <div className="text-slate-500 whitespace-nowrap dark:text-slate-400">
                                                {RESULT_DETAIL_LABELS[key] || key}
                                            </div>
                                            <div className="text-right font-medium dark:text-slate-200 truncate max-w-[150px]" title={valueStr}>
                                                {formattedValue}
                                            </div>
                                            {valueStr.length > 15 && (
                                                <div className="absolute right-0 bottom-full mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-[280px] whitespace-normal break-all pointer-events-none">
                                                    {valueStr}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 단계별 상세 설명 */}
                    {data.stepDetails && data.stepDetails.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                단계별 상세 설명
                            </h4>
                            <div className="space-y-3">
                                {data.stepDetails.map((step) => (
                                    <div key={step.stepNumber} className="rounded-lg border bg-slate-50 dark:bg-slate-700 dark:border-slate-600 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium text-slate-700 dark:text-slate-200">
                                                {step.stepNumber}단계: {step.stepName}
                                            </div>
                                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                {step.score} / {step.maxScore}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{step.description}</p>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded p-2">
                                            {step.details}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default InvestmentDetailModal;
