import { useState, useEffect, Fragment } from 'react';
import ExcelJS from 'exceljs';
import { send } from '@/util/ClientUtil';
import Toast from '@/component/common/display/Toast';
import PageTitle from '@/component/common/display/PageTitle';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';
import AlertModal from '@/component/layouts/common/popup/AlertModal';
import SellCriteriaModal from '@/pages/cointrade/popup/SellCriteriaModal';
import BuyCriteriaModal from '@/pages/cointrade/popup/BuyCriteriaModal';
import ConfigOverviewModal from '@/pages/cointrade/popup/ConfigOverviewModal';

/**
 * 코인 자동매매 파라미터 설정 페이지 (모멘텀 스캘핑)
 */

const PARAM_GROUPS = {
    WS: {
        label: 'WebSocket 실시간 매매',
        params: [
            { key: 'WS_ENABLED', label: '실시간 매매', type: 'toggle' },
            { key: 'WS_BUY_RATIO_MIN', label: '매수 비율 최소', type: 'number', step: 0.05 },
            { key: 'WS_VOLUME_SPIKE_RATIO', label: '거래량 급증 배율', type: 'number', step: 0.5 },
            { key: 'WS_SIGNAL_WINDOW_SEC', label: '감지 시간창(초)', type: 'number' },
            { key: 'WS_MIN_TRADES', label: '최소 체결 건수', type: 'number' },
        ]
    },
    SCANNER: {
        label: 'REST 스캐너 (백그라운드 학습용)',
        params: [
            { key: 'SCANNER_ENABLED', label: '스캐너', type: 'toggle' },
            { key: 'SCANNER_INTERVAL_SECONDS', label: '스캔 주기(초)', type: 'number' },
            { key: 'SCANNER_VOLUME_RATIO_MIN', label: '최소 거래량 배율', type: 'number', step: 0.1 },
            { key: 'SCANNER_PRICE_CHANGE_MIN', label: '최소 가격변화율(%)', type: 'number', step: 0.1 },
            { key: 'SCANNER_RSI_MIN', label: 'RSI 하한', type: 'number' },
            { key: 'SCANNER_RSI_MAX', label: 'RSI 상한', type: 'number' },
            { key: 'SCANNER_VWAP_DEVIATION_MAX', label: 'VWAP 이탈 최대(%)', type: 'number', step: 0.1 },
            { key: 'SCANNER_LOOKBACK_MINUTES', label: '감지 시간창(분)', type: 'number' },
            { key: 'SCANNER_MIN_TRADE_VALUE', label: '최소 거래대금(원)', type: 'number' },
            { key: 'SCANNER_MAX_SIGNALS', label: '최대 시그널 수', type: 'number' },
        ]
    },
    ML: {
        label: 'ML 모델 설정',
        params: [
            { key: 'ML_ENABLED', label: 'ML 확인', type: 'toggle' },
            { key: 'ML_MIN_CONFIDENCE', label: '최소 확률', type: 'number', step: 0.01 },
            { key: 'ML_CANDLE_UNIT', label: '분봉 단위', type: 'number' },
            { key: 'ML_TRAIN_LOOKBACK_CANDLES', label: '학습 데이터 수', type: 'number' },
            { key: 'ML_FUTURE_CANDLES', label: '예측 캔들 수', type: 'number' },
            { key: 'ML_RISE_THRESHOLD_PCT', label: '상승 기준(%)', type: 'number', step: 0.1 },
        ]
    },
    BUY: {
        label: '매수 설정',
        params: [
            { key: 'BUY_AMOUNT_PER_COIN', label: '종목당 금액(원)', type: 'number' },
            { key: 'BUY_MAX_CONCURRENT', label: '최대 동시보유', type: 'number' },
            { key: 'BUY_MIN_BALANCE', label: '최소 잔고(원)', type: 'number' },
            { key: 'BUY_COOLDOWN_MINUTES', label: '재매수 쿨다운(분)', type: 'number' },
            { key: 'BUY_USE_MARKET_ORDER', label: '시장가 주문', type: 'toggle' },
            { key: 'TARGET_MODE', label: '대상 모드', type: 'select', options: ['ALL', 'SELECTED'] },
        ]
    },
    SELL: {
        label: '매도 설정',
        params: [
            { key: 'SELL_ENABLED', label: '매도', type: 'toggle' },
            { key: 'SELL_CHECK_SECONDS', label: '체크 주기(초)', type: 'number' },
            { key: 'TAKE_PROFIT_PCT', label: '익절(%)', type: 'number', step: 0.1 },
            { key: 'STOP_LOSS_PCT', label: '손절(%)', type: 'number', step: 0.1 },
            { key: 'TRAILING_STOP_ENABLED', label: '트레일링 스탑', type: 'toggle' },
            { key: 'TRAILING_STOP_ACTIVATION_PCT', label: '트레일링 활성화(%)', type: 'number', step: 0.1 },
            { key: 'TRAILING_STOP_RATE_PCT', label: '트레일링 하락(%)', type: 'number', step: 0.1 },
            { key: 'MAX_HOLD_MINUTES', label: '최대 보유(분)', type: 'number' },
            { key: 'SELL_CHECK_WAIT_SECONDS', label: '주문 확인 대기(초)', type: 'number' },
        ]
    },
    SYSTEM: {
        label: '시스템 설정',
        params: [
            { key: 'MAX_CONCURRENT_REQUESTS', label: 'API 동시요청 수', type: 'number' },
            { key: 'MAX_CONCURRENT_PROCESS', label: '동시 처리 종목 수', type: 'number' },
            { key: 'TRADING_FEE_RATE', label: '수수료율', type: 'number', step: 0.0001 },
        ]
    },
};

// 모든 파라미터 키 추출
const ALL_PARAM_KEYS = Object.values(PARAM_GROUPS).flatMap(g => g.params.map(p => p.key));

// 파라미터 메타데이터 맵 생성
const PARAM_META = {};
Object.values(PARAM_GROUPS).forEach(group => {
    group.params.forEach(p => {
        PARAM_META[p.key] = p;
    });
});

// ConfigOverviewModal 호환을 위한 paramGroups 변환 (keys 배열 형태)
const PARAM_GROUPS_FOR_OVERVIEW = {};
Object.entries(PARAM_GROUPS).forEach(([groupKey, group]) => {
    PARAM_GROUPS_FOR_OVERVIEW[groupKey] = {
        label: group.label,
        keys: group.params.map(p => p.key)
    };
});

const PARAM_DESCRIPTIONS = {
    WS_ENABLED: 'WebSocket 실시간 체결 감지 매매 (REST 스캐너보다 빠름)',
    WS_BUY_RATIO_MIN: '최근 체결 중 매수(BID) 비율 최소 (0.8 = 80%)',
    WS_VOLUME_SPIKE_RATIO: '최근 거래량 / 1분 평균 거래량 비율',
    WS_SIGNAL_WINDOW_SEC: '시그널 감지에 사용할 최근 시간 (초)',
    WS_MIN_TRADES: '시그널 발생 최소 체결 건수',
    SCANNER_ENABLED: 'REST 스캐너 (백그라운드 ML 학습 + 미시구조 저장)',
    SCANNER_INTERVAL_SECONDS: '전체 마켓을 스캔하는 주기 (초)',
    SCANNER_VOLUME_RATIO_MIN: '최근 거래량 / 평균 거래량 비율 (예: 2.0 = 평균 대비 2배)',
    SCANNER_PRICE_CHANGE_MIN: '스캔 시간창 내 최소 가격 변화율 (%)',
    SCANNER_RSI_MIN: 'RSI 하한값 이하이면 과매도로 제외',
    SCANNER_RSI_MAX: 'RSI 상한값 이상이면 과매수로 제외',
    SCANNER_VWAP_DEVIATION_MAX: 'VWAP 대비 이탈률 최대치 (%)',
    SCANNER_LOOKBACK_MINUTES: '모멘텀 감지에 사용할 시간 창 (분)',
    SCANNER_MIN_TRADE_VALUE: '최소 거래대금 필터 (원)',
    SCANNER_MAX_SIGNALS: '한 주기에 생성할 최대 시그널 수',
    ML_ENABLED: 'ML 모델을 사용하여 매수 시그널을 확인',
    ML_MIN_CONFIDENCE: 'ML 모델의 최소 예측 확률 (0~1)',
    ML_CANDLE_UNIT: '학습/예측에 사용할 분봉 단위 (분)',
    ML_TRAIN_LOOKBACK_CANDLES: '학습에 사용할 캔들 수',
    ML_FUTURE_CANDLES: '예측 대상 기간 (캔들 수, 5분봉 기준 24=2시간, 12=1시간)',
    ML_RISE_THRESHOLD_PCT: '상승 판단 기준 % (낮추면 매수 빈도↑, 높이면 정확도↑)',
    BUY_ENABLED: '매수 기능 활성화',
    BUY_AMOUNT_PER_COIN: '한 종목당 매수 금액 (원)',
    BUY_MAX_CONCURRENT: '동시에 보유할 수 있는 최대 종목 수',
    BUY_MIN_BALANCE: '이 금액 이하이면 매수하지 않음 (원)',
    BUY_COOLDOWN_MINUTES: '같은 종목 재매수까지 최소 대기 시간 (분)',
    BUY_USE_MARKET_ORDER: '시장가 주문 사용 여부 (true: 시장가, false: 지정가)',
    TARGET_MODE: 'ALL: KRW 마켓 전체 종목, SELECTED: 대상종목설정에서 선택한 종목만',
    SELL_ENABLED: '매도 기능 활성화',
    SELL_CHECK_SECONDS: '보유 종목 매도 조건 체크 주기 (초)',
    TAKE_PROFIT_PCT: '목표 수익률 도달 시 매도 (%)',
    STOP_LOSS_PCT: '손실 한도 도달 시 매도 (%)',
    TRAILING_STOP_ENABLED: '트레일링 스탑 활성화',
    TRAILING_STOP_ACTIVATION_PCT: '수익률이 이 값 이상일 때 트레일링 시작 (%)',
    TRAILING_STOP_RATE_PCT: '최고가 대비 이 비율 하락 시 매도 (%)',
    MAX_HOLD_MINUTES: '이 시간 초과 시 강제 매도 (분)',
    SELL_CHECK_WAIT_SECONDS: '매도 주문 후 체결 확인 대기 (초)',
    MAX_CONCURRENT_REQUESTS: '업비트 API 동시 요청 수',
    MAX_CONCURRENT_PROCESS: '동시 처리할 종목 수',
    TRADING_FEE_RATE: '거래소 수수료율 (0.05%는 0.0005로 입력)',
};

export default function CointradeConfig() {
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [isSellCriteriaModalOpen, setIsSellCriteriaModalOpen] = useState(false);
    const [isBuyCriteriaModalOpen, setIsBuyCriteriaModalOpen] = useState(false);
    const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);

    // 변경 확인 모달 상태
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [changedParams, setChangedParams] = useState([]);

    // 초기 파라미터 상태 (변경 감지용)
    const [initialParams, setInitialParams] = useState({});

    // 파라미터 상태 (동적 초기화)
    const [params, setParams] = useState(() => {
        const init = {};
        ALL_PARAM_KEYS.forEach(key => {
            const meta = PARAM_META[key];
            init[key] = meta.type === 'toggle' ? 'false' : '';
        });
        return init;
    });

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 페이지 로드 시 현재 설정값 조회
    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const { data, error } = await send('/dart/api/cointrade/config', {}, 'GET');

            if (error) {
                setToast('설정값을 불러오는데 실패했습니다: ' + error);
            } else if (data?.success && data?.response) {
                const configList = data.response;
                const configMap = {};

                configList.forEach(config => {
                    const key = config.configKey || config.paramName;
                    const value = config.configValue || config.paramValue;

                    if (params.hasOwnProperty(key)) {
                        configMap[key] = value;
                    }
                });

                setParams(prev => ({ ...prev, ...configMap }));
                setInitialParams(prev => ({ ...prev, ...configMap }));
            }
        } catch (e) {
            console.error('설정값 조회 실패:', e);
            setToast('설정값을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // 거래 수수료율 검증 (0~1)
        if (params['TRADING_FEE_RATE']) {
            const value = parseFloat(params['TRADING_FEE_RATE']);
            if (isNaN(value) || value < 0 || value > 1) {
                setToast('수수료율은 0~1 사이의 값이어야 합니다. (예: 0.05%는 0.0005로 입력)');
                return;
            }
        }

        // 변경된 항목 찾기
        const changes = [];
        Object.keys(params).forEach(key => {
            if (String(params[key]) !== String(initialParams[key] || '')) {
                changes.push({
                    key,
                    label: getParamLabel(key),
                    oldValue: initialParams[key] || '(비어있음)',
                    newValue: params[key]
                });
            }
        });

        if (changes.length === 0) {
            setToast('변경된 내용이 없습니다.');
            return;
        }

        setChangedParams(changes);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmModalOpen(false);
        setSaveLoading(true);
        try {
            const configList = Object.entries(params).map(([key, value]) => ({
                configKey: key,
                configValue: value?.toString() || ''
            }));

            const { data, error } = await send('/dart/api/cointrade/config', configList, 'PUT');

            if (error) {
                setToast('저장에 실패했습니다: ' + error);
            } else if (data?.success) {
                setToast('설정이 저장되었습니다.');
                setInitialParams({ ...params });
            }
        } catch (e) {
            console.error('설정 저장 실패:', e);
            setToast('설정 저장 중 오류가 발생했습니다.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleExportText = () => {
        try {
            const lines = [];
            lines.push(`코인 자동매매 파라미터 설정 (${new Date().toLocaleString()})`);
            lines.push('='.repeat(50));
            lines.push('');

            Object.entries(PARAM_GROUPS).forEach(([groupKey, group]) => {
                lines.push(`[${group.label}]`);
                group.params.forEach(({ key, label }) => {
                    lines.push(`${key} (${label}) : ${params[key]}`);
                });
                lines.push('');
            });

            const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cointrade_Config_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Text export failed:', e);
            setToast('텍스트 내보내기 중 오류가 발생했습니다.');
        }
    };

    const handleExportExcel = async () => {
        try {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('자동매매 파라미터');

            ws.mergeCells('A1:E1');
            const titleCell = ws.getCell('A1');
            titleCell.value = `코인 자동매매 파라미터 설정 (${new Date().toLocaleString()})`;
            titleCell.font = { size: 16, bold: true };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(1).height = 30;

            const headers = ['그룹', '항목명', '설명', '설정값', '키(Key)'];
            const headerRow = ws.getRow(2);
            headerRow.values = headers;

            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
            headerRow.height = 25;

            ws.getColumn(1).width = 15;
            ws.getColumn(2).width = 25;
            ws.getColumn(3).width = 60;
            ws.getColumn(4).width = 20;
            ws.getColumn(5).width = 25;

            let rowIndex = 3;

            Object.entries(PARAM_GROUPS).forEach(([groupKey, group]) => {
                const startRow = rowIndex;

                group.params.forEach(({ key, label }) => {
                    const row = ws.getRow(rowIndex);
                    row.values = [group.label, label, getParamDescription(key), params[key], key];

                    row.eachCell((cell, colNumber) => {
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        cell.alignment = { vertical: 'middle', wrapText: true };
                        if (colNumber === 4) cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    });

                    rowIndex++;
                });

                if (rowIndex - startRow > 0) {
                    ws.mergeCells(`A${startRow}:A${rowIndex - 1}`);
                }
            });

            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cointrade_Config_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Excel export failed:', e);
            setToast('엑셀 내보내기 중 오류가 발생했습니다.');
        }
    };

    const handleInputChange = (key, value) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const getParamLabel = (key) => {
        return PARAM_META[key]?.label || key;
    };

    const getParamDescription = (key) => {
        return PARAM_DESCRIPTIONS[key] || '';
    };

    // 입력 필드 렌더링
    const renderInput = (paramDef) => {
        const { key, type, step, options } = paramDef;
        const value = params[key];

        if (type === 'toggle') {
            return (
                <select
                    value={value}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }

        if (type === 'select' && options) {
            return (
                <select
                    value={value}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                >
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        return (
            <Input
                type="number"
                className="w-full h-10 md:h-9 dark:!bg-slate-600 dark:placeholder-slate-300"
                value={value}
                onChange={(e) => handleInputChange(key, e.target.value)}
                placeholder="0"
                step={step || '1'}
            />
        );
    };

    return (
        <div className="p-2 md:p-4">
            <PageTitle>자동매매 파라미터 설정</PageTitle>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-slate-600 dark:text-slate-400">로딩 중...</div>
                </div>
            ) : (
                <>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                    모멘텀 스캘핑 파라미터
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        즉시 반영
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        저장 후 다음 주기부터 반영됩니다.
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                                <Button
                                    size="sm"
                                    onClick={() => setIsOverviewModalOpen(true)}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    한눈에 보기
                                </Button>
                                <Button variant="secondary" size="sm" onClick={handleExportText}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    텍스트로 내보내기
                                </Button>
                                <Button variant="success" size="sm" onClick={handleExportExcel}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    엑셀로 내보내기
                                </Button>
                            </div>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            {/* 헤더 - 데스크톱 전용 */}
                            <div className="hidden md:grid md:grid-cols-12 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 font-semibold text-sm text-slate-600 dark:text-slate-300">
                                <div className="p-4 md:col-span-3 text-center">항목</div>
                                <div className="p-4 md:col-span-6 text-center">설명</div>
                                <div className="p-4 md:col-span-3 text-center">설정값</div>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {Object.entries(PARAM_GROUPS).map(([groupKey, group]) => (
                                    <Fragment key={groupKey}>
                                        {/* 그룹 헤더 */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                                {group.label}
                                            </div>
                                            {groupKey === 'BUY' && (
                                                <button
                                                    onClick={() => setIsBuyCriteriaModalOpen(true)}
                                                    className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 underline underline-offset-2 flex items-center gap-1 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    매수 기준 설명
                                                </button>
                                            )}
                                            {groupKey === 'SELL' && (
                                                <button
                                                    onClick={() => setIsSellCriteriaModalOpen(true)}
                                                    className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 underline underline-offset-2 flex items-center gap-1 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    매도 기준 설명
                                                </button>
                                            )}
                                        </div>

                                        {group.params.map((paramDef) => (
                                            <div key={paramDef.key} className="group/row">
                                                <div className="grid grid-cols-1 md:grid-cols-12 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors duration-150 p-4 gap-3 md:gap-0">
                                                    {/* 항목명 */}
                                                    <div className="md:col-span-3 flex flex-col justify-center gap-1">
                                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:text-base">
                                                                {paramDef.label}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                                            {paramDef.key}
                                                        </span>
                                                    </div>

                                                    {/* 설명 */}
                                                    <div className="md:col-span-6 flex items-center md:px-4">
                                                        <div className="text-sm text-slate-500 dark:text-slate-400 w-full">
                                                            {getParamDescription(paramDef.key)}
                                                        </div>
                                                    </div>

                                                    {/* 입력 필드 */}
                                                    <div className="md:col-span-3 flex items-center">
                                                        {renderInput(paramDef)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </Fragment>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 저장 버튼 */}
                    <div className="flex justify-end gap-3">
                        <Button
                            onClick={handleSave}
                            disabled={saveLoading}
                        >
                            {saveLoading ? '저장 중...' : '저장'}
                        </Button>
                    </div>
                </>
            )}

            {/* Toast 메시지 */}
            <Toast message={toast} />

            {/* 매도 기준 설명 모달 */}
            <SellCriteriaModal
                isOpen={isSellCriteriaModalOpen}
                onClose={() => setIsSellCriteriaModalOpen(false)}
            />

            {/* 매수 기준 설명 모달 */}
            <BuyCriteriaModal
                isOpen={isBuyCriteriaModalOpen}
                onClose={() => setIsBuyCriteriaModalOpen(false)}
            />

            {/* 설정값 한눈에 보기 모달 */}
            <ConfigOverviewModal
                isOpen={isOverviewModalOpen}
                onClose={() => setIsOverviewModalOpen(false)}
                params={params}
                getParamLabel={getParamLabel}
                getParamDescription={getParamDescription}
                paramGroups={PARAM_GROUPS_FOR_OVERVIEW}
            />

            {/* 변경 확인 모달 */}
            <AlertModal
                open={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmSave}
                title="설정 변경 확인"
            >
                <div className="space-y-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                        다음 {changedParams.length}개 항목을 변경하시겠습니까?
                    </p>
                    <div className="max-h-[60vh] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-sm">
                        <ul className="space-y-2">
                            {changedParams.map((item) => (
                                <li key={item.key} className="flex flex-col border-b border-slate-200 dark:border-slate-800 last:border-0 pb-2 last:pb-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {item.label}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                            {item.key}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                        <span className="text-orange-500 line-through bg-orange-50 dark:bg-orange-900/20 px-1 rounded">
                                            {item.oldValue}
                                        </span>
                                        <span className="text-slate-400">→</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-1 rounded">
                                            {item.newValue}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </AlertModal>
        </div>
    );
}
