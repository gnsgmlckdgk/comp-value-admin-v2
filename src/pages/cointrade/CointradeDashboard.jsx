import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { send } from '@/util/ClientUtil';
import useModalAnimation from '@/hooks/useModalAnimation';
import Toast from '@/component/common/display/Toast';
import PageTitle from '@/component/common/display/PageTitle';
import TradeFilterHelpModal from '@/component/common/display/TradeFilterHelpModal';
import ScannerSignalsHelpModal from '@/component/common/display/ScannerSignalsHelpModal';
import ColumnFilterDropdown from '@/component/common/display/ColumnFilterDropdown';
import Button from '@/component/common/button/Button';
import UpbitCandleChart from '@/pages/cointrade/UpbitCandleChart';

// 숫자를 천 단위 콤마 포맷으로 변환
const formatNumberWithComma = (value) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US');
};

// 날짜 포맷 (YYYY-MM-DD HH:MM:SS)
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

// 사유 색상 (색각이상 친화: 파랑/주황/노랑 팔레트)
const getReasonColor = (reason) => {
    const colors = {
        'MOMENTUM_SIGNAL': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        'SIGNAL': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        'PARTIAL_SIGNAL': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
        'TAKE_PROFIT': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
        'STOP_LOSS': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
        'PARTIAL_TAKE_PROFIT': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
        'PARTIAL_STOP_LOSS': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
        'TRAILING_STOP': 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300',
        'PARTIAL_TRAILING_STOP': 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400',
        'MANUAL': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
        'PARTIAL_MANUAL': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
        'MANUAL_CLEANUP': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
        'CLEANUP_NO_BALANCE': 'bg-slate-200 dark:bg-slate-600/30 text-slate-700 dark:text-slate-300',
        'MAX_HOLD_EXPIRED': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
        'MAX_HOLDING_EXPIRED': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
    };

    if (colors[reason]) return colors[reason];

    // {N}DAY_PROFIT 패턴
    if (/^\d+DAY_PROFIT$/.test(reason)) {
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    }
    if (/^PARTIAL_\d+DAY_PROFIT$/.test(reason)) {
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
    }

    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
};

// 사유 라벨
const getReasonLabel = (reason) => {
    const labels = {
        'MOMENTUM_SIGNAL': '모멘텀 진입',
        'SIGNAL': '매수',
        'PARTIAL_SIGNAL': '부분매수',
        'TAKE_PROFIT': '익절',
        'STOP_LOSS': '손절',
        'PARTIAL_TAKE_PROFIT': '부분익절',
        'PARTIAL_STOP_LOSS': '부분손절',
        'TRAILING_STOP': '트레일링스탑',
        'PARTIAL_TRAILING_STOP': '부분트레일링',
        'MANUAL': '수동매도',
        'MANUAL_CLEANUP': '수동정리',
        'CLEANUP_NO_BALANCE': '잔고정리',
        'PARTIAL_MANUAL': '부분수동',
        'MAX_HOLD_EXPIRED': '강제청산',
        'MAX_HOLDING_EXPIRED': '강제청산'
    };

    if (labels[reason]) return labels[reason];

    // {N}DAY_PROFIT 패턴
    const dayProfitMatch = reason?.match(/^(\d+)DAY_PROFIT$/);
    if (dayProfitMatch) return `${dayProfitMatch[1]}일수익`;

    const partialDayProfitMatch = reason?.match(/^PARTIAL_(\d+)DAY_PROFIT$/);
    if (partialDayProfitMatch) return `부분${partialDayProfitMatch[1]}일`;

    return reason;
};

// 시그널 유형 스타일/라벨
const getSignalTypeStyle = (type) => ({
    'MEAN_REVERSION': 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300',
    'WS_MOMENTUM': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
}[type] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400');

const getSignalTypeLabel = (type) => ({
    'MEAN_REVERSION': 'MR',
    'WS_MOMENTUM': 'WS',
}[type] || type);

// 시그널 처리결과 스타일/라벨
const getActionStyle = (action) => {
    if (!action || action === 'NONE') return 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
    if (action === 'BUY_EXECUTED' || action === 'PAPER_BUY') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    if (action === 'BUY_FAILED') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
};

const getActionLabel = (action) => ({
    'BUY_EXECUTED': '매수 체결',
    'PAPER_BUY': '모의 매수',
    'BUY_FAILED': '매수 실패',
    'SKIPPED_LIMIT': '한도 초과',
    'SKIPPED_HELD': '보유 중',
    'SKIPPED_BALANCE': '잔액 부족',
    'SKIPPED_ML_FAIL': 'ML 실패',
    'SKIPPED_ML': 'ML 미달',
    'SKIPPED_SL_FILTER': 'SL 필터',
    'SKIPPED_LOCKED': '잠금',
    'NONE': '-',
}[action] || action);

// D-day 계산
const calculateDday = (date) => {
    if (!date) return '-';
    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return <span className="text-orange-600 dark:text-orange-400 font-bold">만료</span>;
    if (diff === 0) return <span className="text-orange-600 dark:text-orange-400 font-bold">D-Day</span>;
    if (diff <= 3) return <span className="text-orange-600 dark:text-orange-400 font-medium">D-{diff}</span>;
    return <span className="text-slate-600 dark:text-slate-400">D-{diff}</span>;
};

// 컬럼 너비 정의
const COL_WIDTHS = {
    createdAt: '160px',
    coinCode: '100px',
    tradeType: '80px',
    reason: '100px',
    profitLossRate: '140px',
};

// 테이블 컬럼 정의
const TABLE_COLUMNS = [
    {
        key: 'createdAt',
        label: '일시',
        width: COL_WIDTHS.createdAt,
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-900 dark:text-slate-100',
        render: (value) => formatDateTime(value)
    },
    {
        key: 'coinCode',
        label: '종목',
        width: COL_WIDTHS.coinCode,
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left font-medium text-slate-900 dark:text-slate-100',
    },
    {
        key: 'tradeType',
        label: '유형',
        width: COL_WIDTHS.tradeType,
        sortable: true,
        filterable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center',
        filterLabelFn: (v) => v === 'BUY' ? '매수' : v === 'SELL' ? '매도' : v,
        render: (value) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === 'BUY'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                {value === 'BUY' ? '매수' : '매도'}
            </span>
        )
    },
    {
        key: 'reason',
        label: '사유',
        width: COL_WIDTHS.reason,
        sortable: true,
        filterable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center',
        filterLabelFn: (v) => getReasonLabel(v),
        render: (value) => value ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(value)}`}>
                {getReasonLabel(value)}
            </span>
        ) : '-'
    },
    {
        key: 'profitLossRate',
        label: '손익률',
        width: COL_WIDTHS.profitLossRate,
        sortable: true,
        headerClassName: 'px-4 py-3 pr-12 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 pr-12 whitespace-nowrap text-right',
        render: (value) => value != null ? (
            <span className={value >= 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-orange-600 dark:text-orange-400 font-medium'}>
                {value >= 0 ? '+' : ''}{value.toFixed(2)}%
            </span>
        ) : '-'
    }
];

// 통화 단위 계산
const getCurrencyUnit = (coinCode) => {
    if (!coinCode) return '';
    const prefix = coinCode.split('-')[0];
    return prefix === 'KRW' ? '원' : ` ${prefix}`;
};

// 가격 표시 컴포넌트 (정수부 볼드 처리)
const renderFormattedPrice = (value, unit) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const str = num.toLocaleString('en-US');
    const parts = str.split('.');

    return (
        <span>
            <span className="font-extrabold" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>{parts[0]}</span>
            <span className="font-normal opacity-70">{parts.length > 1 && `.${parts[1]}`}</span>
            <span className="font-normal">{unit}</span>
        </span>
    );
};

// 소수점 숫자 볼드 처리 (수량 등)
const renderFormattedNumber = (value, decimals = 8) => {
    if (value === null || value === '' || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const str = num.toFixed(decimals);
    const parts = str.split('.');

    return (
        <span>
            <span className="font-extrabold" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>{parts[0]}</span>
            <span className="font-normal opacity-70">{parts.length > 1 && `.${parts[1]}`}</span>
        </span>
    );
};

// 남은 시간 계산 (분 단위)
const calculateTimeRemaining = (maxHoldUntil) => {
    if (!maxHoldUntil) return '-';
    const now = new Date();
    const until = new Date(maxHoldUntil);
    const diffMs = until - now;
    if (diffMs <= 0) return <span className="text-orange-600 dark:text-orange-400 font-bold">만료</span>;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return <span className="text-amber-600 dark:text-amber-400 font-medium">{diffMin}분</span>;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return <span className="text-slate-600 dark:text-slate-400">{hours}시간 {mins}분</span>;
};

// 업비트 보유량 대조 허용 오차 (업비트 소수점 정밀도 8자리 고려)
const QUANTITY_MISMATCH_TOLERANCE = 1e-8;

// 보유 종목 컬럼 너비 정의
const HOLDINGS_COL_WIDTHS = {
    checkbox: '50px',
    coinCode: '100px',
    buyPrice: '120px',
    currentPrice: '120px',
    quantity: '120px',
    valuation: '120px',
    profitRate: '100px',
    momentumScore: '100px',
    mlConfidence: '100px',
    entryReason: '180px',
    timeRemaining: '110px',
    buyDate: '120px',
};

// 보유 종목 테이블 컬럼 정의 (모멘텀 스캘핑)
const HOLDINGS_TABLE_COLUMNS = [
    {
        key: 'checkbox',
        label: '',
        width: HOLDINGS_COL_WIDTHS.checkbox,
        sortable: false,
        sticky: true,
        headerClassName: 'px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-2 py-3 whitespace-nowrap text-center',
        isCheckbox: true
    },
    {
        key: 'coinCode',
        label: '종목',
        width: HOLDINGS_COL_WIDTHS.coinCode,
        sortable: true,
        sticky: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left font-medium text-slate-900 dark:text-slate-100',
    },
    {
        key: 'buyPrice',
        label: '매수가',
        width: HOLDINGS_COL_WIDTHS.buyPrice,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-900 dark:text-slate-100',
        render: (value, row) => renderFormattedPrice(value, getCurrencyUnit(row.coinCode))
    },
    {
        key: 'currentPrice',
        label: '현재가',
        width: HOLDINGS_COL_WIDTHS.currentPrice,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900 dark:text-slate-100',
        render: (value, row) => {
            if (!value) return '-';
            const rate = (row.buyPrice && row.buyPrice > 0)
                ? ((value - row.buyPrice) / row.buyPrice) * 100
                : 0;
            return (
                <div className="flex flex-col items-end">
                    {renderFormattedPrice(value, getCurrencyUnit(row.coinCode))}
                    <span className={`text-xs ${rate >= 0 ? 'text-blue-500 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'}`}>
                        ({rate >= 0 ? '+' : ''}{rate.toFixed(2)}%)
                    </span>
                </div>
            );
        }
    },
    {
        key: 'quantity',
        label: '수량',
        width: HOLDINGS_COL_WIDTHS.quantity,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-slate-900 dark:text-slate-100',
        render: (value, row) => {
            const db = value ? value.toFixed(8) : '-';
            if (!row.quantityMismatch) return db;
            // 업비트 실제 수량과 불일치: 색각이상 친화 amber 팔레트
            const upbitText = row.upbitQuantity != null ? row.upbitQuantity.toFixed(8) : '0';
            const label = row.quantityMismatch === 'missing' ? '업비트 미보유' : `업비트: ${upbitText}`;
            return (
                <div className="flex flex-col items-end gap-0.5">
                    <span>{db}</span>
                    <span
                        title="DB 보유량과 업비트 실제 보유량이 다릅니다. 수동 매매·장애·미동기화 가능성."
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700"
                    >
                        {label}
                    </span>
                </div>
            );
        }
    },
    {
        key: 'valuation',
        label: '평가금액',
        width: HOLDINGS_COL_WIDTHS.valuation,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900 dark:text-slate-100',
        render: (value, row) => renderFormattedPrice(value, getCurrencyUnit(row.coinCode))
    },
    {
        key: 'profitRate',
        label: '수익률',
        width: HOLDINGS_COL_WIDTHS.profitRate,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right',
        render: (value) => (
            <span className={`font-bold ${value >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-orange-600 dark:text-orange-400'
                }`}>
                {value >= 0 ? '+' : ''}{value.toFixed(2)}%
            </span>
        )
    },
    {
        key: 'momentumScore',
        label: '모멘텀',
        width: HOLDINGS_COL_WIDTHS.momentumScore,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right',
        render: (value) => {
            if (value == null) return '-';
            const score = typeof value === 'number' ? value : parseFloat(value);
            if (isNaN(score)) return '-';
            const colorClass = score >= 0.7 ? 'text-blue-600 dark:text-blue-400' : score >= 0.4 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400';
            return <span className={`font-medium ${colorClass}`}>{(score * 100).toFixed(0)}%</span>;
        }
    },
    {
        key: 'mlConfidence',
        label: 'ML 확률',
        width: HOLDINGS_COL_WIDTHS.mlConfidence,
        sortable: true,
        headerClassName: 'px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-right text-blue-600 dark:text-blue-400 font-medium',
        render: (value) => value != null ? `${(value * 100).toFixed(1)}%` : '-'
    },
    {
        key: 'entryReason',
        label: '진입 사유',
        width: HOLDINGS_COL_WIDTHS.entryReason,
        sortable: true,
        filterable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center',
        render: (value) => {
            if (!value) return '-';
            const colorMap = {
                'SCANNER': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
                'ML_CONFIRMED': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
                'MANUAL': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
            };
            const colorClass = colorMap[value] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
            return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>{value}</span>;
        }
    },
    {
        key: 'maxHoldUntil',
        label: '남은시간',
        width: HOLDINGS_COL_WIDTHS.timeRemaining,
        sortable: true,
        headerClassName: 'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-center',
        render: (value) => calculateTimeRemaining(value)
    },
    {
        key: 'buyDate',
        label: '매수일시',
        width: HOLDINGS_COL_WIDTHS.buyDate,
        sortable: true,
        headerClassName: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        cellClassName: 'px-4 py-3 whitespace-nowrap text-left text-slate-900 dark:text-slate-100',
        render: (value) => {
            if (!value) return '-';
            const d = new Date(value);
            return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
        }
    },
];

/**
 * 코인 자동매매 대시보드 (v2.2)
 * - 테이블 디자인 및 기능 개선 (Sticky Header, Sorting, Filtering)
 */
export default function CointradeDashboard() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 상태 정보
    const [status, setStatus] = useState({
        buySchedulerEnabled: false,
        sellSchedulerEnabled: false,
        totalInvestment: 0,
        totalValuation: 0,
        totalProfitRate: 0,
        holdingsCount: 0
    });

    // 설정 정보
    const [config, setConfig] = useState({
        maxHoldMinutes: 60,
        wsEnabled: false,
        liveStartedAt: null,
    });

    // 실매매 경과시간 — 렌더링마다 직접 계산 (background fetch로 주기적 갱신됨)

    // Scanner Signals
    const [scannerSignals, setScannerSignals] = useState([]);
    const [signalTypeFilter, setSignalTypeFilter] = useState('ALL');
    const [actionFilter, setActionFilter] = useState('ALL');

    const filteredSignals = useMemo(() => {
        return scannerSignals.filter(s => {
            if (signalTypeFilter !== 'ALL' && s.signalType !== signalTypeFilter) return false;
            if (actionFilter === 'BUY') return s.actionTaken === 'BUY_EXECUTED' || s.actionTaken === 'PAPER_BUY';
            if (actionFilter === 'SKIPPED') return s.actionTaken?.startsWith('SKIPPED');
            return true;
        });
    }, [scannerSignals, signalTypeFilter, actionFilter]);

    // KRW 잔액
    const [krwBalance, setKrwBalance] = useState(0);

    // 업비트 미추적 보유 (DB holdings에는 없으나 업비트 계좌에 잔액이 있는 코인)
    const [unaccountedBalances, setUnaccountedBalances] = useState([]);

    // 먼지(dust) 격리 잔량 — 업비트 최소주문(5,000원) 미만이라 API 매도 불가
    const [dustBalances, setDustBalances] = useState([]);
    const [resolvingDustId, setResolvingDustId] = useState(null);


    // 보유 종목
    const [holdings, setHoldings] = useState([]);

    // 최근 거래 내역 (전체 데이터)
    const [allRecentTrades, setAllRecentTrades] = useState([]);

    // 상세보기 모달 상태
    const [selectedHolding, setSelectedHolding] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const { shouldRender: renderDetailModal, isAnimatingOut: isDetailModalClosing } = useModalAnimation(isDetailModalOpen, 250);

    // 매도 관련 상태
    const [selectedCoins, setSelectedCoins] = useState([]);
    const [showSellModal, setShowSellModal] = useState(false);
    const { shouldRender: renderSellModal, isAnimatingOut: isSellModalClosing } = useModalAnimation(showSellModal, 250);
    const [sellResult, setSellResult] = useState(null);
    const { shouldRender: renderSellResult, isAnimatingOut: isSellResultClosing } = useModalAnimation(!!sellResult, 250);
    const [isSelling, setIsSelling] = useState(false);

    // 테이블 필터/정렬 상태 (값: Set 또는 null)
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    // 필터 드롭다운 상태
    const [filterDropdown, setFilterDropdown] = useState(null); // { tableId, colKey, anchorRect }

    // 필터 도움말 모달 상태
    const [isFilterHelpModalOpen, setIsFilterHelpModalOpen] = useState(false);
    const [isScannerHelpModalOpen, setIsScannerHelpModalOpen] = useState(false);

    // 보유 종목 테이블 필터/정렬 상태 (값: Set 또는 null)
    const [holdingsColumnFilters, setHoldingsColumnFilters] = useState({});
    const [holdingsSortConfig, setHoldingsSortConfig] = useState({ key: 'profitRate', direction: 'desc' });

    const [itemsPerPage, setItemsPerPage] = useState(9999); // 기본 전체보기
    const [currentPage, setCurrentPage] = useState(0); // 0-based for server
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // 예측 성능 요약
    const [performance, setPerformance] = useState({
        takeProfitRate: 0,
        stopLossRate: 0,
        expiredRate: 0,
        maxHoldingExpiredRate: 0,
        trailingStopRate: 0,
        trailingStopProfitRate: 0,
        trailingStopLossRate: 0,
        avgProfitRate: 0,
        totalTrades: 0
    });

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 데이터 조회
    const fetchData = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            // 1. 설정 조회 (PREDICTION_DAYS 등)
            const configResponse = await send('/dart/api/cointrade/config', {}, 'GET');
            if (configResponse.data?.success && configResponse.data?.response) {
                const configList = configResponse.data.response;
                const configMap = {};

                // API 응답을 객체로 변환
                configList.forEach(config => {
                    const key = config.configKey || config.paramName;
                    const value = config.configValue || config.paramValue;
                    configMap[key] = value;
                });

                setConfig({
                    maxHoldMinutes: parseInt(configMap.MAX_HOLD_MINUTES || 60),
                    wsEnabled: configMap.WS_ENABLED === 'true',
                    liveStartedAt: configMap.LIVE_TRADING_STARTED_AT || null,
                });

                // config에서 스캐너/매도 상태 설정
                setStatus(prev => ({
                    ...prev,
                    buySchedulerEnabled: configMap.SCANNER_ENABLED === 'true',
                    sellSchedulerEnabled: configMap.SELL_ENABLED === 'true',
                    paperTrading: configMap.PAPER_TRADING === 'true',
                }));
            }

            // 3. 업비트 전체 계좌 조회 (KRW 잔액 + 보유 코인 잔액)
            //    balances 호출 실패 시에만 기존 KRW 전용 API로 폴백
            const upbitBalanceByCoin = {}; // coinCode → {balance, avgBuyPrice, locked}
            let balancesCallOk = false;
            try {
                const balancesResponse = await send('/dart/api/cointrade/account/balances', {}, 'GET');
                if (balancesResponse.data?.success && balancesResponse.data?.response) {
                    const resp = balancesResponse.data.response;
                    const balances = resp.balances || [];
                    // 업비트 인증 실패 시 대조를 건너뛴다 (balances가 빈 배열이어도 전체 holding을 "미보유"로 오인 방지)
                    balancesCallOk = resp.authenticated !== false;
                    balances.forEach(b => {
                        if (b.currency === 'KRW') {
                            setKrwBalance((b.balance || 0) + (b.locked || 0));
                        } else if (b.coin_code) {
                            upbitBalanceByCoin[b.coin_code] = {
                                balance: b.balance || 0,
                                locked: b.locked || 0,
                                avgBuyPrice: b.avg_buy_price || 0,
                            };
                        }
                    });
                }
            } catch (balancesError) {
                console.error('업비트 전체 계좌 조회 실패:', balancesError);
            }

            if (!balancesCallOk) {
                try {
                    const balanceResponse = await send('/dart/api/cointrade/account/balance', {}, 'GET');
                    if (balanceResponse.data?.success && balanceResponse.data?.response) {
                        const resp = balanceResponse.data.response;
                        const bal = resp.balance ?? resp.data?.krw_balance ?? resp.data?.balance;
                        if (bal != null) setKrwBalance(bal);
                    }
                } catch (balanceError) {
                    console.error('KRW 잔액 조회 실패:', balanceError);
                }
            }

            // 4. 보유 종목 조회
            const holdingsResponse = await send('/dart/api/cointrade/holdings', {}, 'GET');
            if (holdingsResponse.data?.success && holdingsResponse.data?.response) {
                let initialHoldings = holdingsResponse.data.response;

                // 보유 종목이 있는 경우 현재가 조회 (업비트 API)
                if (initialHoldings.length > 0) {
                    try {
                        const marketCodes = initialHoldings.map(h => h.coinCode).join(',');
                        const tickerResponse = await send(`/dart/api/upbit/v1/ticker?markets=${marketCodes}`, {}, 'GET');

                        if (tickerResponse.data?.success && tickerResponse.data?.response) {
                            const tickerMap = {};
                            tickerResponse.data.response.forEach(ticker => {
                                tickerMap[ticker.market] = ticker.trade_price;
                            });

                            // 현재가 업데이트
                            initialHoldings = initialHoldings.map(holding => {
                                const currentPrice = tickerMap[holding.coinCode] || holding.currentPrice; // API 값이 없으면 기존 값 사용
                                return {
                                    ...holding,
                                    currentPrice
                                };
                            });
                        }
                    } catch (tickerError) {
                        console.error('현재가 조회 실패:', tickerError);
                        // 실패해도 기존 holding 데이터로 계속 진행
                    }
                }

                // 수익률 및 평가금액 계산하여 상태에 저장
                let newTotalInvestment = 0;
                let newTotalValuation = 0;

                const calculatedHoldings = initialHoldings.map(holding => {
                    const profitRate = holding.currentPrice
                        ? ((holding.currentPrice - holding.buyPrice) / holding.buyPrice * 100)
                        : 0;
                    const valuation = holding.currentPrice
                        ? holding.currentPrice * holding.quantity
                        : holding.totalAmount;

                    newTotalInvestment += (holding.totalAmount || 0);
                    newTotalValuation += valuation;

                    // 업비트 실제 수량과 대조 (balances 호출 성공 시에만 의미 있음)
                    let upbitQuantity = null;
                    let quantityMismatch = null; // 'missing' | 'diff' | null
                    if (balancesCallOk) {
                        const upbit = upbitBalanceByCoin[holding.coinCode];
                        if (!upbit) {
                            upbitQuantity = 0;
                            quantityMismatch = 'missing';
                        } else {
                            const totalQty = (upbit.balance || 0) + (upbit.locked || 0);
                            upbitQuantity = totalQty;
                            const diff = Math.abs((holding.quantity || 0) - totalQty);
                            if (diff > QUANTITY_MISMATCH_TOLERANCE) {
                                quantityMismatch = 'diff';
                            }
                        }
                    }

                    return {
                        ...holding,
                        profitRate,
                        valuation,
                        upbitQuantity,
                        quantityMismatch
                    };
                });
                setHoldings(calculatedHoldings);

                // 먼지(dust) 격리 목록 조회 — 업비트 경고 배너/미추적 목록에서 제외하기 위해 먼저 load
                let dustCoinSet = new Set();
                try {
                    const dustResponse = await send('/dart/api/cointrade/dust?status=ACTIVE', {}, 'GET');
                    if (dustResponse.data?.success && Array.isArray(dustResponse.data?.response)) {
                        const dustList = dustResponse.data.response;
                        setDustBalances(dustList);
                        dustCoinSet = new Set(dustList.map(d => d.coin_code));
                    }
                } catch (dustError) {
                    console.error('먼지 잔량 조회 실패:', dustError);
                }

                // DB에 없는 업비트 보유코인 추출 (KRW 제외, 잔액 > 0, 먼지 격리 종목 제외)
                if (balancesCallOk) {
                    const trackedCoins = new Set(calculatedHoldings.map(h => h.coinCode));
                    const untracked = Object.entries(upbitBalanceByCoin)
                        .filter(([coinCode, v]) =>
                            !trackedCoins.has(coinCode)
                            && !dustCoinSet.has(coinCode)
                            && ((v.balance || 0) + (v.locked || 0)) > QUANTITY_MISMATCH_TOLERANCE
                        )
                        .map(([coinCode, v]) => ({
                            coinCode,
                            quantity: (v.balance || 0) + (v.locked || 0),
                            avgBuyPrice: v.avgBuyPrice || 0,
                        }));
                    setUnaccountedBalances(untracked);
                } else {
                    setUnaccountedBalances([]);
                }

                // 상단 카드 상태 업데이트 (실시간 평가금액 반영)
                const newTotalProfitRate = newTotalInvestment > 0
                    ? ((newTotalValuation - newTotalInvestment) / newTotalInvestment) * 100
                    : 0;

                setStatus(prev => ({
                    ...prev,
                    totalInvestment: newTotalInvestment,
                    totalValuation: newTotalValuation,
                    totalProfitRate: newTotalProfitRate,
                    holdingsCount: calculatedHoldings.length
                }));
            }

            // 5. 최근 거래 내역 조회 (서버 사이드 페이징)
            await fetchRecentTrades(0, itemsPerPage, isBackground);

            // 6. Scanner Signals 조회
            try {
                const signalsResponse = await send('/dart/api/cointrade/scanner/signals', {}, 'GET');
                if (signalsResponse.data?.success && signalsResponse.data?.response) {
                    setScannerSignals(signalsResponse.data.response.map(s => ({
                        id: s.id,
                        coinCode: s.coin_code,
                        detectedAt: s.detected_at,
                        signalType: s.signal_type,
                        momentumScore: s.momentum_score,
                        volumeRatio: s.volume_ratio,
                        priceChangePct: s.price_change_pct,
                        rsiValue: s.rsi_value,
                        vwapDeviation: s.vwap_deviation,
                        mlConfidence: s.ml_confidence,
                        actionTaken: s.action_taken,
                        currentPrice: s.current_price,
                    })));
                }
            } catch (signalError) {
                console.error('스캐너 시그널 조회 실패:', signalError);
            }

        } catch (e) {
            console.error('데이터 조회 실패:', e);
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [itemsPerPage]);

    // 최근 거래 내역 조회 (서버 사이드 페이징)
    const fetchRecentTrades = useCallback(async (page = 0, size = 10, isBackground = false) => {
        try {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);

            // 날짜와 시간 조립 (ISO 8601 형식)
            const formatDateParam = (date) => {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };

            const startDateStr = formatDateParam(thirtyDaysAgo);
            const endDateStr = formatDateParam(today);

            const startDateTime = `${startDateStr}T00:00:00`;
            const endDateTime = `${endDateStr}T23:59:59`;

            const historyResponse = await send(
                `/dart/api/cointrade/history?startDate=${startDateTime}&endDate=${endDateTime}&page=${page}&size=${size}`,
                {},
                'GET'
            );

            if (historyResponse.data?.success && historyResponse.data?.response) {
                const response = historyResponse.data.response;
                const trades = response.content || [];
                setAllRecentTrades(trades);
                setTotalElements(response.totalElements || 0);
                setTotalPages(response.totalPages || 0);
                setCurrentPage(page);

                // 첫 페이지 조회 시에만 성능 계산 (전체 데이터 기준이 아닌 현재 페이지 데이터 기준)
                // 정확한 성능 계산이 필요하면 백엔드에서 별도 API 제공 필요
                if (page === 0) {
                    calculatePerformance(trades);
                }
            } else {
                setAllRecentTrades([]);
                setTotalElements(0);
                setTotalPages(0);
            }
        } catch (e) {
            console.error('거래 내역 조회 실패:', e);
            setAllRecentTrades([]);
        }
    }, []);

    // 예측 성능 계산
    const calculatePerformance = (trades) => {
        const sellTrades = trades.filter(t => t.tradeType === 'SELL');
        const totalSells = sellTrades.length;

        if (totalSells === 0) {
            setPerformance({
                takeProfitRate: 0,
                stopLossRate: 0,
                expiredRate: 0,
                maxHoldingExpiredRate: 0,
                trailingStopRate: 0,
                avgProfitRate: 0,
                totalTrades: 0
            });
            return;
        }

        const takeProfitCount = sellTrades.filter(t => ['TAKE_PROFIT', 'PARTIAL_TAKE_PROFIT'].includes(t.reason)).length;
        const stopLossCount = sellTrades.filter(t => ['STOP_LOSS', 'PARTIAL_STOP_LOSS'].includes(t.reason)).length;
        const expiredCount = sellTrades.filter(t => {
            const reason = t.reason || '';
            return reason === 'EXPIRED' ||
                   /^\d+DAY_PROFIT$/.test(reason) ||
                   /^PARTIAL_\d+DAY_PROFIT$/.test(reason);
        }).length;
        const maxHoldingExpiredCount = sellTrades.filter(t => t.reason === 'MAX_HOLDING_EXPIRED').length;
        const trailingStopTrades = sellTrades.filter(t => t.reason === 'TRAILING_STOP');
        const trailingStopCount = trailingStopTrades.length;
        const trailingStopProfitCount = trailingStopTrades.filter(t => (t.profitLoss || 0) > 0).length;
        const trailingStopLossCount = trailingStopTrades.filter(t => (t.profitLoss || 0) <= 0).length;

        const totalProfit = sellTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
        const totalAmount = sellTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        const avgProfitRate = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

        setPerformance({
            takeProfitRate: (takeProfitCount / totalSells) * 100,
            stopLossRate: (stopLossCount / totalSells) * 100,
            expiredRate: (expiredCount / totalSells) * 100,
            maxHoldingExpiredRate: (maxHoldingExpiredCount / totalSells) * 100,
            trailingStopRate: (trailingStopCount / totalSells) * 100,
            trailingStopProfitRate: trailingStopCount > 0 ? (trailingStopProfitCount / trailingStopCount) * 100 : 0,
            trailingStopLossRate: trailingStopCount > 0 ? (trailingStopLossCount / trailingStopCount) * 100 : 0,
            avgProfitRate,
            totalTrades: totalSells
        });
    };

    // 보유 종목 데이터 처리 (필터링 -> 정렬)
    const processedHoldings = useMemo(() => {
        // 1. 필터링 (Set 기반: 선택된 값만 통과)
        let data = holdings.filter(row => {
            return Object.entries(holdingsColumnFilters).every(([key, allowedSet]) => {
                if (!allowedSet) return true;
                const cellValue = String(row[key] ?? '');
                return allowedSet.has(cellValue);
            });
        });

        // 2. 정렬
        if (holdingsSortConfig.key) {
            data.sort((a, b) => {
                const aVal = a[holdingsSortConfig.key];
                const bVal = b[holdingsSortConfig.key];

                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return holdingsSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                }

                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                return holdingsSortConfig.direction === 'asc'
                    ? aStr.localeCompare(bStr)
                    : bStr.localeCompare(aStr);
            });
        }

        return data;
    }, [holdings, holdingsColumnFilters, holdingsSortConfig]);

    // 유형 라벨 (필터용)
    const getTradeTypeLabel = (type) => {
        const labels = { 'BUY': '매수', 'SELL': '매도' };
        return labels[type] || type;
    };

    // 최근 거래 데이터 처리 (필터링 -> 정렬)
    const processedData = useMemo(() => {
        // 1. 필터링 (Set 기반: 선택된 값만 통과)
        let data = allRecentTrades.filter(row => {
            return Object.entries(columnFilters).every(([key, allowedSet]) => {
                if (!allowedSet) return true;
                const cellValue = String(row[key] ?? '');
                return allowedSet.has(cellValue);
            });
        });

        // 2. 정렬
        if (sortConfig.key) {
            data.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                }

                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                return sortConfig.direction === 'asc'
                    ? aStr.localeCompare(bStr)
                    : bStr.localeCompare(aStr);
            });
        }

        return data;
    }, [allRecentTrades, columnFilters, sortConfig]);

    // 서버 사이드 페이징 - processedData가 현재 페이지 데이터
    const currentRecords = processedData;

    // 핸들러들

    // 필터 드롭다운 열기 (헤더 클릭 시)
    const openFilterDropdown = useCallback((tableId, colKey, event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setFilterDropdown({ tableId, colKey, anchorRect: rect });
    }, []);

    // 필터 적용 (Set 기반)
    const applyFilter = useCallback((tableId, colKey, selectedValues) => {
        const setter = tableId === 'trades' ? setColumnFilters : setHoldingsColumnFilters;
        setter(prev => {
            const next = { ...prev };
            if (selectedValues === null) {
                delete next[colKey]; // 전체 선택 = 필터 해제
            } else {
                next[colKey] = new Set(selectedValues);
            }
            return next;
        });
    }, []);

    const clearColumnFilters = useCallback(() => {
        setColumnFilters({});
    }, []);

    const clearHoldingsColumnFilters = useCallback(() => {
        setHoldingsColumnFilters({});
    }, []);

    const handleSort = useCallback((key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    const handleHoldingsSort = useCallback((key) => {
        setHoldingsSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    // 컬럼의 고유값 추출
    const getUniqueValues = useCallback((data, colKey) => {
        const values = new Set();
        data.forEach(row => values.add(String(row[colKey] ?? '')));
        return Array.from(values).sort();
    }, []);

    // 페이지 변경 (서버에서 다시 조회)
    const handlePageChange = (page) => {
        fetchRecentTrades(page, itemsPerPage, false);
    };

    // 페이지 당 개수 변경
    const handleItemsPerPageChange = (e) => {
        const newSize = Number(e.target.value);
        setItemsPerPage(newSize);
        fetchRecentTrades(0, newSize, false);
    };

    // 보유 종목 상세보기 모달 핸들러
    const handleRowDoubleClick = (holding) => {
        setSelectedHolding(holding);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedHolding(null);
    };

    // 매도 관련 핸들러
    const handleCoinSelect = useCallback((coinCode) => {
        setSelectedCoins(prev => {
            if (prev.includes(coinCode)) {
                return prev.filter(c => c !== coinCode);
            } else {
                return [...prev, coinCode];
            }
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedCoins.length === processedHoldings.length) {
            setSelectedCoins([]);
        } else {
            setSelectedCoins(processedHoldings.map(h => h.coinCode));
        }
    }, [selectedCoins.length, processedHoldings]);

    const handleSellClick = () => {
        setShowSellModal(true);
    };

    const handleSellConfirm = async () => {
        setIsSelling(true);
        try {
            const requestBody = selectedCoins.length > 0
                ? { coin_codes: selectedCoins }
                : {};

            const { data, error } = await send('/dart/api/holdings/sell', requestBody, 'POST');

            if (error) {
                setSellResult({
                    status: 'error',
                    message: error.message || '매도 요청 중 오류가 발생했습니다.'
                });
            } else {
                setSellResult(data);
            }
        } catch (err) {
            setSellResult({
                status: 'error',
                message: '매도 요청 중 오류가 발생했습니다.'
            });
        } finally {
            setIsSelling(false);
            setShowSellModal(false);
        }
    };

    const handleSellCancel = () => {
        setShowSellModal(false);
    };

    const handleSellResultClose = () => {
        setSellResult(null);
        setSelectedCoins([]);
        fetchData(false); // 매도 후 데이터 새로고침
    };

    // 먼지 정리완료 처리
    const handleResolveDust = async (dustId, coinCode) => {
        if (!window.confirm(`${coinCode} 먼지 잔량을 정리 완료로 처리하시겠습니까?\n(업비트에서 수동으로 정리한 뒤 누르세요)`)) return;
        setResolvingDustId(dustId);
        try {
            const { data, error } = await send(`/dart/api/cointrade/dust/${dustId}/resolve`, {}, 'POST');
            if (error) {
                setToast(error.message || '먼지 정리완료 처리 중 오류가 발생했습니다.');
            } else if (data?.response?.status === 'success') {
                setToast(data.response.message || '정리완료 처리됨');
                await fetchData(true);
            } else {
                setToast(data?.response?.message || '정리완료 처리 결과를 확인하세요.');
            }
        } catch (err) {
            setToast('먼지 정리완료 처리 중 오류가 발생했습니다.');
        } finally {
            setResolvingDustId(null);
        }
    };

    // 페이지 로드 시 + 30초마다 자동 새로고침
    useEffect(() => {
        fetchData(false); // 초기 로딩은 loading 표시
        const interval = setInterval(() => fetchData(true), 15000); // 15초마다 백그라운드 갱신
        return () => clearInterval(interval);
    }, [fetchData]);

    // 수동 새로고침
    const handleRefresh = () => {
        fetchData(false); // 수동 갱신은 loading 표시
        setToast('데이터가 갱신되었습니다.');
    };

    return (
        <div className="px-2 py-8 md:px-4">
            <div className="flex items-center justify-between mb-6">
                <PageTitle>자동매매 대시보드</PageTitle>
                <Button onClick={handleRefresh} disabled={loading}>
                    {loading ? '갱신 중...' : '새로고침'}
                </Button>
            </div>

            {/* 상단 카드 영역 */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                {/* 스케줄러 상태 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">스케줄러 상태</div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400">매수</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.buySchedulerEnabled
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                {status.buySchedulerEnabled ? 'ON' : 'OFF'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400">매도</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.sellSchedulerEnabled
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}>
                                {status.sellSchedulerEnabled ? 'ON' : 'OFF'}
                            </span>
                        </div>
                        {config.wsEnabled && config.liveStartedAt && (() => {
                            const diff = Math.floor((Date.now() - new Date(config.liveStartedAt).getTime()) / 1000);
                            if (diff < 0) return null;
                            const d = Math.floor(diff / 86400);
                            const h = Math.floor((diff % 86400) / 3600);
                            const m = Math.floor((diff % 3600) / 60);
                            const text = d > 0 ? `${d}일 ${h}시간 ${m}분` : h > 0 ? `${h}시간 ${m}분` : `${m}분`;
                            return (
                                <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
                                    <span className="text-xs text-blue-600 dark:text-blue-400">{text} 경과</span>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* KRW 잔액 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">KRW 잔액</div>
                    <div className="text-xl font-medium text-slate-800 dark:text-slate-200">
                        {renderFormattedPrice(Math.floor(krwBalance), '원')}
                    </div>
                </div>

                {/* 보유 종목 수 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">보유 종목 수</div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                        {status.holdingsCount}
                    </div>
                </div>

                {/* 총 투자금액 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 투자금액</div>
                    <div className="text-xl font-medium text-slate-800 dark:text-slate-200">
                        {renderFormattedPrice(Math.floor(status.totalInvestment), '원')}
                    </div>
                </div>

                {/* 총 평가금액 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 평가금액</div>
                    <div className="text-xl font-medium text-slate-800 dark:text-slate-200">
                        {renderFormattedPrice(Math.floor(status.totalValuation), '원')}
                    </div>
                    {status.totalInvestment > 0 && (() => {
                        const diff = Math.floor(status.totalValuation - status.totalInvestment);
                        const isPositive = diff >= 0;
                        return (
                            <div className={`text-xs font-medium mt-1 ${isPositive ? 'text-blue-500 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'}`}>
                                {isPositive ? '+' : ''}{renderFormattedPrice(diff, '원')}
                            </div>
                        );
                    })()}
                </div>

                {/* 잔액 + 투자금 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">잔액 + 투자금</div>
                    <div className="text-xl font-medium text-slate-800 dark:text-slate-200">
                        {renderFormattedPrice(Math.floor(krwBalance + status.totalInvestment), '원')}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        <span className="text-[10px]">잔액+평가</span> ({renderFormattedPrice(Math.floor(krwBalance + status.totalValuation), '원')})
                    </div>
                </div>

                {/* 총 수익률 */}
                <div className={`rounded-lg shadow-sm border p-4 ${status.totalProfitRate >= 0
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'
                    }`}>
                    <div className={`text-xs mb-1 ${status.totalProfitRate >= 0
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-orange-700 dark:text-orange-400'
                        }`}>
                        총 수익률
                    </div>
                    <div className={`text-3xl font-bold ${status.totalProfitRate >= 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-orange-600 dark:text-orange-400'
                        }`}>
                        {status.totalProfitRate >= 0 ? '+' : ''}{status.totalProfitRate.toFixed(2)}%
                    </div>
                </div>

            </div>

            {/* 보유 종목 테이블 */}

            <div className="mb-6">
                {unaccountedBalances.length > 0 && (
                    <div className="mb-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200 text-sm">
                        <div className="font-semibold mb-1">
                            업비트에만 있는 보유 코인 {unaccountedBalances.length}건 (DB 미추적)
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            {unaccountedBalances.map(u => (
                                <span key={u.coinCode} className="font-mono">
                                    {u.coinCode}: {u.quantity.toFixed(8)}
                                </span>
                            ))}
                        </div>
                        <div className="mt-1 text-xs opacity-80">
                            자동매매 대상이 아니거나 수동 매매/외부 경로로 취득한 코인일 수 있습니다.
                        </div>
                    </div>
                )}
                <div className="px-2 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">

                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">

                        보유 종목 ({holdings.length})

                    </h2>

                    <div className="flex items-center gap-2">
                        {selectedCoins.length > 0 && (
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {selectedCoins.length}개 선택
                            </span>
                        )}

                        <Button variant="danger" onClick={handleSellClick} disabled={holdings.length === 0}>
                            매도
                        </Button>

                        {Object.keys(holdingsColumnFilters).length > 0 && (

                            <Button variant="secondary" size="sm" onClick={clearHoldingsColumnFilters}>
                                필터 초기화
                            </Button>

                        )}
                    </div>

                </div>

                <div className="overflow-x-auto overflow-y-auto scrollbar-always bg-white border border-slate-200 rounded-lg shadow-sm max-h-[500px] dark:bg-slate-800 dark:border-slate-700" style={{ scrollbarGutter: 'stable' }}>
                  <div style={{ minWidth: '1200px' }}>
                    <table className="w-full table-fixed border-separate border-spacing-0 text-sm">

                        <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600 text-white">

                            <tr>
                                {HOLDINGS_TABLE_COLUMNS.map((col, index) => {
                                    const leftPosition = col.sticky
                                        ? (index === 0 ? 0 : index === 1 ? '50px' : undefined)
                                        : undefined;
                                    const hasFilter = !!holdingsColumnFilters[col.key];

                                    return (
                                        <th
                                            key={col.key}
                                            className={`${col.headerClassName} ${col.sortable || col.filterable ? 'cursor-pointer hover:bg-slate-500 select-none' : ''} ${col.sticky ? 'sticky z-20 bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}
                                            style={{ width: col.width, left: leftPosition }}
                                            onClick={(e) => col.sortable && handleHoldingsSort(col.key)}
                                        >
                                            {col.isCheckbox ? (
                                                <input
                                                    type="checkbox"
                                                    checked={processedHoldings.length > 0 && selectedCoins.length === processedHoldings.length}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            ) : (
                                                <div className={`flex items-center gap-1 ${col.headerClassName.includes('text-center') ? 'justify-center' : col.headerClassName.includes('text-right') ? 'justify-end' : 'justify-start'}`}>
                                                    <span>{col.label}</span>
                                                    {col.sortable && (
                                                        <span className="flex flex-col text-[10px] leading-none opacity-60">
                                                            <span className={holdingsSortConfig.key === col.key && holdingsSortConfig.direction === 'asc' ? 'opacity-100 text-yellow-300' : ''}>▲</span>
                                                            <span className={holdingsSortConfig.key === col.key && holdingsSortConfig.direction === 'desc' ? 'opacity-100 text-yellow-300' : ''}>▼</span>
                                                        </span>
                                                    )}
                                                    {col.filterable && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openFilterDropdown('holdings', col.key, e); }}
                                                            className={`ml-0.5 p-0.5 rounded hover:bg-slate-500/50 ${hasFilter ? 'text-yellow-300' : 'text-white/40'}`}
                                                            title="필터"
                                                        >
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">

                            {loading ? (

                                <tr>

                                    <td colSpan={HOLDINGS_TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">

                                        조회 중입니다...

                                    </td>

                                </tr>

                            ) : processedHoldings.length === 0 ? (

                                <tr>

                                    <td colSpan={HOLDINGS_TABLE_COLUMNS.length} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">

                                        보유 종목이 없습니다.

                                    </td>

                                </tr>

                            ) : (

                                processedHoldings.map((holding, index) => {

                                    return (

                                        <tr

                                            key={index}

                                            onClick={() => handleCoinSelect(holding.coinCode)}

                                            onDoubleClick={() => handleRowDoubleClick(holding)}

                                            className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedCoins.includes(holding.coinCode) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}

                                        >

                                            {HOLDINGS_TABLE_COLUMNS.map((col, colIndex) => {

                                                const value = holding[col.key];

                                                const displayValue = col.render ? col.render(value, holding, config) : (value ?? '-');

                                                const leftPosition = col.sticky
                                                    ? (colIndex === 0 ? 0 : colIndex === 1 ? '50px' : undefined)
                                                    : undefined;

                                                return (

                                                    <td

                                                        key={col.key}

                                                        className={`${col.cellClassName} ${col.sticky ? `sticky z-[5] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${selectedCoins.includes(holding.coinCode) ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-800'}` : ''}`}

                                                        style={{

                                                            width: col.width,

                                                            left: leftPosition

                                                        }}

                                                        onClick={(e) => {
                                                            if (col.isCheckbox) {
                                                                e.stopPropagation();
                                                            }
                                                        }}

                                                    >
                                                        {col.isCheckbox ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCoins.includes(holding.coinCode)}
                                                                onChange={() => handleCoinSelect(holding.coinCode)}
                                                                className="w-4 h-4 cursor-pointer"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            displayValue
                                                        )}

                                                    </td>

                                                );

                                            })}

                                        </tr>

                                    );

                                })

                            )}

                        </tbody>

                    </table>
                  </div>
                </div>

            </div>

            {/* 먼지(dust) 격리 목록 — 업비트 최소주문(5,000원) 미만 잔량, 수동 정리 대기 */}
            {dustBalances.length > 0 && (
                <div className="mb-6">
                    <div className="px-2 py-3 flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                            먼지 격리 잔량 ({dustBalances.length})
                            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                                업비트 최소주문(5,000원) 미만이라 API 매도 불가 — 수동 정리 후 "정리완료" 처리
                            </span>
                        </h2>
                    </div>
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">종목</th>
                                    <th className="px-3 py-2 text-right font-semibold">잔량</th>
                                    <th className="px-3 py-2 text-right font-semibold">감지 당시 현재가</th>
                                    <th className="px-3 py-2 text-right font-semibold">평가액(원)</th>
                                    <th className="px-3 py-2 text-left font-semibold">사유</th>
                                    <th className="px-3 py-2 text-left font-semibold">감지 시각</th>
                                    <th className="px-3 py-2 text-center font-semibold">작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dustBalances.map(d => (
                                    <tr key={d.id} className="border-t border-slate-200 dark:border-slate-700">
                                        <td className="px-3 py-2 font-mono text-slate-800 dark:text-slate-200">{d.coin_code}</td>
                                        <td className="px-3 py-2 text-right font-mono">{Number(d.quantity).toFixed(8)}</td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            {d.last_price != null ? formatNumberWithComma(Number(d.last_price).toFixed(4)) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-amber-700 dark:text-amber-300">
                                            {d.value_krw != null ? formatNumberWithComma(Math.round(d.value_krw)) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{d.reason || '-'}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{formatDateTime(d.detected_at)}</td>
                                        <td className="px-3 py-2 text-center">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleResolveDust(d.id, d.coin_code)}
                                                disabled={resolvingDustId === d.id}
                                            >
                                                {resolvingDustId === d.id ? '처리 중...' : '정리완료'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 최근 거래 내역 테이블 */}
                <div>
                    <div className="px-2 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Link
                                to="/cointrade/history"
                                className="group inline-flex items-center gap-1 text-lg font-semibold text-slate-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="거래기록 조회 페이지로 이동"
                            >
                                <span className="group-hover:underline">최근 거래 내역</span>
                                <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <span className="text-sm text-slate-500 dark:text-slate-400">(최근 30일)</span>
                            <button
                                type="button"
                                onClick={() => setIsFilterHelpModalOpen(true)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                                title="필터 도움말"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                            >
                                <option value={9999}>전체보기</option>
                                <option value={10}>10개씩</option>
                                <option value={20}>20개씩</option>
                                <option value={50}>50개씩</option>
                            </select>
                            {Object.keys(columnFilters).length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearColumnFilters}
                                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                                >
                                    필터 초기화
                                </button>
                            )}
                            {totalElements > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium text-xs dark:bg-blue-900 dark:text-blue-200">
                                    총 {totalElements.toLocaleString()}건
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto overflow-y-auto scrollbar-always bg-white border border-slate-200 rounded-lg shadow-sm max-h-[500px] dark:bg-slate-800 dark:border-slate-700" style={{ scrollbarGutter: 'stable' }}>
                      <div style={{ minWidth: '680px' }}>
                        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
                            <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                                <tr>
                                    {TABLE_COLUMNS.map((col, index) => {
                                        const hasFilter = !!columnFilters[col.key];
                                        return (
                                            <th
                                                key={col.key}
                                                className={`${col.headerClassName} ${col.sortable || col.filterable ? 'cursor-pointer hover:bg-slate-500 select-none' : ''} ${col.sticky ? 'sticky z-20 bg-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]' : ''}`}
                                                style={{
                                                    width: col.width,
                                                    left: col.sticky ? (index === 0 ? 0 : col.left) : undefined
                                                }}
                                                onClick={() => col.sortable && handleSort(col.key)}
                                            >
                                                <div className={`flex items-center gap-1 ${col.headerClassName.includes('text-center') ? 'justify-center' : col.headerClassName.includes('text-right') ? 'justify-end' : 'justify-start'}`}>
                                                    <span>{col.label}</span>
                                                    {col.sortable && (
                                                        <span className="flex flex-col text-[10px] leading-none opacity-60">
                                                            <span className={sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'opacity-100 text-yellow-300' : ''}>▲</span>
                                                            <span className={sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'opacity-100 text-yellow-300' : ''}>▼</span>
                                                        </span>
                                                    )}
                                                    {col.filterable && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openFilterDropdown('trades', col.key, e); }}
                                                            className={`ml-0.5 p-0.5 rounded hover:bg-slate-500/50 ${hasFilter ? 'text-yellow-300' : 'text-white/40'}`}
                                                            title="필터"
                                                        >
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-800 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                                            조회 중입니다...
                                        </td>
                                    </tr>
                                ) : currentRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                                            거래 내역이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    currentRecords.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50 transition-colors dark:hover:bg-slate-700">
                                            {TABLE_COLUMNS.map((col, index) => {
                                                const value = row[col.key];
                                                const displayValue = col.render ? col.render(value, row) : (value ?? '-');
                                                return (
                                                    <td
                                                        key={col.key}
                                                        className={`${col.cellClassName} ${col.sticky ? 'sticky z-[5] bg-white dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}
                                                        style={{
                                                            width: col.width,
                                                            left: col.sticky ? (index === 0 ? 0 : col.left) : undefined
                                                        }}
                                                    >
                                                        {displayValue}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 페이지네이션 (서버 사이드) */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 0}
                                className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 text-sm"
                            >
                                이전
                            </button>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {currentPage + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages - 1}
                                className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 text-sm"
                            >
                                다음
                            </button>
                        </div>
                    )}
                </div>

                {/* 매도 성능 요약 */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                        매도 성능 요약 (최근 30일)
                    </h2>

                    <div className="space-y-4">
                        {/* 총 거래 건수 */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <span className="text-sm text-slate-600 dark:text-slate-400">총 매도 건수</span>
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {performance.totalTrades}건
                            </span>
                        </div>

                        {/* 1. 익절 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">목표 수익률 익절</span>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {performance.takeProfitRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                                    style={{ width: `${performance.takeProfitRate}%` }}
                                />
                            </div>
                        </div>

                        {/* 2. 트레일링스탑 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">트레일링스탑</span>
                                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                                    {performance.trailingStopRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-teal-500 dark:bg-teal-400 h-2 rounded-full"
                                    style={{ width: `${performance.trailingStopRate}%` }}
                                />
                            </div>
                            {performance.trailingStopRate > 0 && (
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <span>수익 <span className="font-semibold text-blue-600 dark:text-blue-400">{performance.trailingStopProfitRate.toFixed(0)}%</span></span>
                                    <span>손실 <span className="font-semibold text-orange-600 dark:text-orange-400">{performance.trailingStopLossRate.toFixed(0)}%</span></span>
                                </div>
                            )}
                        </div>

                        {/* 3. 최대보유시간 강제청산 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">최대보유시간({config.maxHoldMinutes}분) 강제청산</span>
                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                    {performance.maxHoldingExpiredRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-amber-500 dark:bg-amber-400 h-2 rounded-full"
                                    style={{ width: `${performance.maxHoldingExpiredRate}%` }}
                                />
                            </div>
                        </div>

                        {/* 4. 손절 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">손절 (Stop Loss)</span>
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                    {performance.stopLossRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-orange-500 dark:bg-orange-400 h-2 rounded-full"
                                    style={{ width: `${performance.stopLossRate}%` }}
                                />
                            </div>
                        </div>

                        {/* 평균 수익률 */}
                        <div className={`flex items-center justify-between p-4 rounded-lg ${performance.avgProfitRate >= 0
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                            : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800'
                            }`}>
                            <span className={`text-sm font-medium ${performance.avgProfitRate >= 0
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-orange-700 dark:text-orange-400'
                                }`}>
                                실현 평균 수익률
                            </span>
                            <span className={`text-2xl font-bold ${performance.avgProfitRate >= 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-orange-600 dark:text-orange-400'
                                }`}>
                                {performance.avgProfitRate >= 0 ? '+' : ''}{performance.avgProfitRate.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanner Signals Section */}
            <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        Scanner Signals
                        <button
                            type="button"
                            onClick={() => setIsScannerHelpModalOpen(true)}
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white transition-colors text-xs font-bold"
                            title="용어 설명 (MR, WS, 가격변화율 등)"
                            aria-label="Scanner Signals 용어 설명"
                        >
                            ?
                        </button>
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">
                            {filteredSignals.length}/{scannerSignals.length}건
                        </span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* 시그널 유형 필터 */}
                        {[['ALL', '전체'], ['MEAN_REVERSION', 'MR'], ['WS_MOMENTUM', 'WS']].map(([val, label]) => (
                            <button key={val} onClick={() => setSignalTypeFilter(val)}
                                className={`px-3 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
                                    signalTypeFilter === val
                                        ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-medium border-slate-400 dark:border-slate-500'
                                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}>
                                {label}
                            </button>
                        ))}
                        <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
                        {/* 처리결과 필터 */}
                        {[['ALL', '전체'], ['BUY', '매수체결'], ['SKIPPED', '스킵됨']].map(([val, label]) => (
                            <button key={val} onClick={() => setActionFilter(val)}
                                className={`px-3 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
                                    actionFilter === val
                                        ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-medium border-slate-400 dark:border-slate-500'
                                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                {scannerSignals.length === 0 ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                        현재 감지된 시그널이 없습니다.
                    </div>
                ) : filteredSignals.length === 0 ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                        선택한 필터 조건에 맞는 시그널이 없습니다.
                    </div>
                ) : (
                    <>
                        {/* 데스크톱: 테이블 */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">종목</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">유형</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">현재가</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">가격변화율</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">ML 확률</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">거래량</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">결과</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">감지시각</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredSignals.map((signal) => (
                                        <tr key={signal.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                                            signal.actionTaken === 'BUY_EXECUTED' || signal.actionTaken === 'PAPER_BUY' ? 'border-l-2 border-l-blue-500' : ''
                                        }`}>
                                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                                {(signal.coinCode || '').replace('KRW-', '')}
                                            </td>
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getSignalTypeStyle(signal.signalType)}`}>
                                                    {getSignalTypeLabel(signal.signalType)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {signal.currentPrice != null ? Number(signal.currentPrice).toLocaleString('ko-KR') : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                <span className={`font-medium ${(signal.priceChangePct || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                                    {signal.priceChangePct != null ? `${signal.priceChangePct >= 0 ? '+' : ''}${signal.priceChangePct.toFixed(2)}%` : '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                                                {signal.mlConfidence != null ? `${(signal.mlConfidence * 100).toFixed(1)}%` : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {signal.volumeRatio && signal.volumeRatio > 0 ? `${signal.volumeRatio.toFixed(1)}x` : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionStyle(signal.actionTaken)}`}>
                                                    {getActionLabel(signal.actionTaken)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                                {signal.detectedAt ? new Date(signal.detectedAt).toLocaleTimeString('ko-KR', { hour12: false }) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 모바일: 카드 리스트 */}
                        <div className="md:hidden space-y-2">
                            {filteredSignals.map((signal) => {
                                const isBuy = signal.actionTaken === 'BUY_EXECUTED' || signal.actionTaken === 'PAPER_BUY';
                                const priceChangeColor = (signal.priceChangePct || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400';
                                return (
                                    <div key={signal.id} className={`p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${isBuy ? 'border-l-4 border-l-blue-500' : ''}`}>
                                        {/* 헤더: 종목 + 유형 + 결과 */}
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                    {(signal.coinCode || '').replace('KRW-', '')}
                                                </span>
                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getSignalTypeStyle(signal.signalType)}`}>
                                                    {getSignalTypeLabel(signal.signalType)}
                                                </span>
                                            </div>
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium shrink-0 ${getActionStyle(signal.actionTaken)}`}>
                                                {getActionLabel(signal.actionTaken)}
                                            </span>
                                        </div>

                                        {/* 본문: 2x2 그리드 */}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">현재가</span>
                                                <span className="text-slate-700 dark:text-slate-200 font-medium">
                                                    {signal.currentPrice != null ? Number(signal.currentPrice).toLocaleString('ko-KR') : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">변화율</span>
                                                <span className={`font-medium ${priceChangeColor}`}>
                                                    {signal.priceChangePct != null ? `${signal.priceChangePct >= 0 ? '+' : ''}${signal.priceChangePct.toFixed(2)}%` : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">ML 확률</span>
                                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                    {signal.mlConfidence != null ? `${(signal.mlConfidence * 100).toFixed(1)}%` : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">거래량</span>
                                                <span className="text-slate-700 dark:text-slate-200 font-medium">
                                                    {signal.volumeRatio && signal.volumeRatio > 0 ? `${signal.volumeRatio.toFixed(1)}x` : '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 푸터: 감지시각 */}
                                        <div className="mt-2 text-right text-[11px] text-slate-400 dark:text-slate-500">
                                            {signal.detectedAt ? new Date(signal.detectedAt).toLocaleTimeString('ko-KR', { hour12: false }) : '-'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* 자동 새로고침 안내 */}
            <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                15초마다 자동으로 갱신됩니다
            </div>

            {/* Toast 메시지 */}
            <Toast message={toast} />

            {/* 필터 도움말 모달 */}
            <TradeFilterHelpModal isOpen={isFilterHelpModalOpen} onClose={() => setIsFilterHelpModalOpen(false)} />

            {/* Scanner Signals 용어 설명 모달 */}
            <ScannerSignalsHelpModal isOpen={isScannerHelpModalOpen} onClose={() => setIsScannerHelpModalOpen(false)} />

            {/* 엑셀 스타일 필터 드롭다운 */}
            {filterDropdown && (() => {
                const { tableId, colKey, anchorRect } = filterDropdown;
                const data = tableId === 'trades' ? allRecentTrades : holdings;
                const filters = tableId === 'trades' ? columnFilters : holdingsColumnFilters;
                const columns = tableId === 'trades' ? TABLE_COLUMNS : HOLDINGS_TABLE_COLUMNS;
                const col = columns.find(c => c.key === colKey);
                const uniqueValues = getUniqueValues(data, colKey);
                const currentFilter = filters[colKey] ? Array.from(filters[colKey]) : null;

                return (
                    <ColumnFilterDropdown
                        anchorRect={anchorRect}
                        uniqueValues={uniqueValues}
                        currentFilter={currentFilter}
                        labelFn={col?.filterLabelFn}
                        onApply={(selected) => applyFilter(tableId, colKey, selected)}
                        onClose={() => setFilterDropdown(null)}
                    />
                );
            })()}

            {/* 상세보기 모달 */}
            <DetailModal
                isOpen={isDetailModalOpen}
                selectedHolding={selectedHolding}
                onClose={handleCloseDetailModal}
                config={config}
            />

            {/* 매도 확인 모달 */}
            {renderSellModal && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate__animated ${isSellModalClosing ? 'animate__fadeOut' : 'animate__fadeIn'}`}
                    style={{ animationDuration: '0.25s' }}
                    onClick={(e) => e.target === e.currentTarget && handleSellCancel()}
                >
                    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate__animated ${isSellModalClosing ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                매도 확인
                            </h3>
                            <button
                                onClick={handleSellCancel}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                {selectedCoins.length > 0
                                    ? `선택한 ${selectedCoins.length}개 종목을 매도하시겠습니까?`
                                    : `보유 중인 ${holdings.length}개 전체 종목을 매도하시겠습니까?`
                                }
                            </p>

                            {/* 선택된 종목 목록 */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                                    매도 대상 종목 ({selectedCoins.length > 0 ? selectedCoins.length : holdings.length}개)
                                </div>
                                <div className="space-y-2">
                                    {(selectedCoins.length > 0
                                        ? holdings.filter(h => selectedCoins.includes(h.coinCode))
                                        : holdings
                                    ).map((h) => (
                                        <div key={h.coinCode} className="flex items-center justify-between py-1 px-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{h.coinCode}</span>
                                            <span className={`text-sm font-medium ${h.profitRate >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                                {h.profitRate >= 0 ? '+' : ''}{h.profitRate?.toFixed(2)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 푸터 */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                type="button"
                                onClick={handleSellCancel}
                                disabled={isSelling}
                                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleSellConfirm}
                                disabled={isSelling}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSelling ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        매도 중...
                                    </>
                                ) : '매도 확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 매도 결과 모달 */}
            {renderSellResult && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate__animated ${isSellResultClosing ? 'animate__fadeOut' : 'animate__fadeIn'}`}
                    style={{ animationDuration: '0.25s' }}
                    onClick={(e) => e.target === e.currentTarget && handleSellResultClose()}
                >
                    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate__animated ${isSellResultClosing ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
                        {/* 헤더 */}
                        <div className={`flex items-center justify-between px-6 py-4 ${
                            sellResult.success || sellResult.response?.status === 'success'
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'bg-orange-50 dark:bg-orange-900/30'
                        }`}>
                            <h3 className={`text-lg font-bold ${
                                sellResult.success || sellResult.response?.status === 'success'
                                    ? 'text-blue-800 dark:text-blue-300'
                                    : 'text-orange-800 dark:text-orange-300'
                            }`}>
                                {sellResult.success || sellResult.response?.status === 'success' ? '매도 완료' : '매도 실패'}
                            </h3>
                            <button
                                onClick={handleSellResultClose}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="p-6">
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                {sellResult.message || sellResult.response?.message || '처리가 완료되었습니다.'}
                            </p>

                            {sellResult.response?.data && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">총 요청</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{sellResult.response.data.total}건</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">성공</span>
                                        <span className="font-medium text-blue-600 dark:text-blue-400">{sellResult.response.data.success}건</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">실패</span>
                                        <span className="font-medium text-orange-600 dark:text-orange-400">{sellResult.response.data.failed}건</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 푸터 */}
                        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                type="button"
                                onClick={handleSellResultClose}
                                className="px-4 py-2 rounded-lg bg-slate-600 text-white font-medium hover:bg-slate-700 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// 상세보기 모달 컴포넌트 (외부로 분리)
const DetailModal = ({ isOpen, selectedHolding, onClose, config }) => {
    const { shouldRender, isAnimatingOut } = useModalAnimation(isOpen, 250);

    // ESC 키로 모달 닫기 및 스크롤 잠금
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!shouldRender || !selectedHolding) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const profitLoss = selectedHolding.currentPrice
        ? (selectedHolding.currentPrice - selectedHolding.buyPrice) * selectedHolding.quantity
        : 0;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`}
            style={{ animationDuration: '0.25s' }}
            onClick={handleBackdropClick}
        >
            <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto flex flex-col animate__animated ${isAnimatingOut ? 'animate__zoomOut' : 'animate__zoomIn'}`} style={{ animationDuration: '0.25s' }}>
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                            {selectedHolding.coinCode}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${selectedHolding.profitRate >= 0
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                            }`}>
                            {selectedHolding.profitRate >= 0 ? '+' : ''}{selectedHolding.profitRate.toFixed(2)}%
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* 가격 정보 그리드 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {/* 매수가 */}
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매수가</div>
                            <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200">
                                {renderFormattedPrice(selectedHolding.buyPrice, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>

                        {/* 현재가 */}
                        <div className={`rounded-lg p-3 sm:p-4 ${selectedHolding.profitRate >= 0
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'bg-orange-50 dark:bg-orange-900/20'
                            }`}>
                            <div className={`text-xs mb-1 ${selectedHolding.profitRate >= 0
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-orange-700 dark:text-orange-400'
                                }`}>
                                현재가
                            </div>
                            <div className={`text-lg sm:text-xl font-bold ${selectedHolding.profitRate >= 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-orange-600 dark:text-orange-400'
                                }`}>
                                {renderFormattedPrice(selectedHolding.currentPrice, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>

                        {/* 수익률 */}
                        <div className={`rounded-lg p-3 sm:p-4 ${selectedHolding.profitRate >= 0
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'bg-orange-50 dark:bg-orange-900/20'
                            }`}>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">수익률</div>
                            <div className={`text-lg sm:text-xl font-bold ${selectedHolding.profitRate >= 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-orange-600 dark:text-orange-400'
                                }`}>
                                {selectedHolding.profitRate >= 0 ? '+' : ''}{selectedHolding.profitRate.toFixed(2)}%
                            </div>
                        </div>
                    </div>

                    {/* 수량 및 평가 정보 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {/* 수량 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">보유 수량</div>
                            <div className="text-base sm:text-lg text-slate-800 dark:text-slate-200">
                                {selectedHolding.quantity ? renderFormattedNumber(selectedHolding.quantity, 8) : '-'}
                            </div>
                        </div>

                        {/* 평가금액 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">평가금액</div>
                            <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                                {renderFormattedPrice(selectedHolding.valuation, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>

                        {/* 손익금액 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">손익금액</div>
                            <div className={`text-base sm:text-lg font-bold ${profitLoss >= 0
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-orange-600 dark:text-orange-400'
                                }`}>
                                {profitLoss >= 0 ? '+' : ''}{renderFormattedPrice(profitLoss, getCurrencyUnit(selectedHolding.coinCode))}
                            </div>
                        </div>
                    </div>

                    {/* 모멘텀 / ML 정보 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* 모멘텀 점수 */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-blue-700 dark:text-blue-400 mb-2">모멘텀 점수</div>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {selectedHolding.momentumScore != null ? `${(selectedHolding.momentumScore * 100).toFixed(0)}%` : '-'}
                            </div>
                        </div>

                        {/* ML 확률 */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-indigo-700 dark:text-indigo-400 mb-2">ML 확률</div>
                            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                {selectedHolding.mlConfidence != null ? `${(selectedHolding.mlConfidence * 100).toFixed(1)}%` : '-'}
                            </div>
                        </div>

                        {/* 진입 사유 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">진입 사유</div>
                            <div className="text-base font-medium text-slate-800 dark:text-slate-200">
                                {selectedHolding.entryReason || '-'}
                            </div>
                        </div>

                        {/* 남은 시간 */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg p-3 sm:p-4">
                            <div className="text-xs text-amber-700 dark:text-amber-400 mb-1">남은 보유 시간</div>
                            <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                                {calculateTimeRemaining(selectedHolding.maxHoldUntil)}
                            </div>
                        </div>
                    </div>

                    {/* 차트 영역 */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 sm:p-6 pr-0 sm:pr-0 min-h-[300px]">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                            {selectedHolding.coinCode} 시세 차트
                        </h4>
                        <div className="h-[400px]">
                            <UpbitCandleChart market={selectedHolding.coinCode} />
                        </div>
                    </div>

                    {/* 매수일 정보 */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매수일시</div>
                                <div className="text-sm sm:text-base text-slate-800 dark:text-slate-200">
                                    {formatDateTime(selectedHolding.buyDate)}
                                </div>
                            </div>

                            {selectedHolding.maxHoldUntil && (
                                <div className="sm:text-right">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">강제 청산 시각</div>
                                    <div className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400">
                                        {formatDateTime(selectedHolding.maxHoldUntil)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

