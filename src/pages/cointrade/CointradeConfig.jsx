import { useState, useEffect, Fragment } from 'react';
import ExcelJS from 'exceljs';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';
import SellCriteriaModal from '@/pages/cointrade/popup/SellCriteriaModal';
import BuyCriteriaModal from '@/pages/cointrade/popup/BuyCriteriaModal';

/**
 * 코인 자동매매 파라미터 설정 페이지
 */
export default function CointradeConfig() {
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [isSellCriteriaModalOpen, setIsSellCriteriaModalOpen] = useState(false);
    const [isBuyCriteriaModalOpen, setIsBuyCriteriaModalOpen] = useState(false);

    // 기대 수익률 계산기 상태
    const [calcHigh, setCalcHigh] = useState('');
    const [calcLow, setCalcLow] = useState('');

    // 파라미터 상태
    const [params, setParams] = useState({
        BUY_PROFIT_THRESHOLD: '',      // X% (매수 조건 - 레거시 호환 유지 or 제거 확인 필요, 지침상 유지)
        TAKE_PROFIT_BUFFER: '',        // 익절 버퍼 %
        STOP_LOSS_THRESHOLD: '',       // C% (손절선)
        BUY_AMOUNT_PER_COIN: '',       // P원 (종목당 매수금액)
        BUY_WAIT_SECONDS: '',          // Y초 (매수 체결 대기)
        BUY_RETRY_COUNT: '',           // Z회 (매수 재시도)
        SELL_CHECK_SECONDS: '',        // B초 (매도 체결 확인)
        PRICE_MONITOR_SECONDS: '',     // D초 (가격 모니터링)
        BUY_CHECK_HOURS: '',           // E시간 (매수 체크 주기)
        TARGET_MODE: 'ALL',            // ALL 또는 SELECTED 모드
        MIN_UP_PROBABILITY: '',        // 최소 상승 확률 %
        MIN_PROFIT_RATE: '',           // 최소 익절률 %
        MAX_PROFIT_RATE: '',           // 최대 익절률 %
        PREDICTION_DAYS: '',           // 예측 기간 (일)
        TRAIN_SCHEDULE_CRON: '',       // 모델 재학습 스케줄 (Cron)
        ENSEMBLE_MODE: 'ensemble',     // 앙상블 모드
    });

    // 파라미터 그룹 정의
    const PARAM_GROUPS = {
        PREDICTION: {
            label: '설정',
            keys: [
                'PREDICTION_DAYS',
                'TRAIN_SCHEDULE_CRON',
                'ENSEMBLE_MODE'
            ]
        },
        BUY: {
            label: '매수 관련',
            keys: [
                'BUY_AMOUNT_PER_COIN',
                'MIN_UP_PROBABILITY',
                'BUY_PROFIT_THRESHOLD',
                'BUY_WAIT_SECONDS',
                'BUY_RETRY_COUNT',
                'BUY_CHECK_HOURS',
                'TARGET_MODE'
            ]
        },
        SELL: {
            label: '매도 관련',
            keys: [
                'MIN_PROFIT_RATE',
                'MAX_PROFIT_RATE',
                'TAKE_PROFIT_BUFFER',
                'STOP_LOSS_THRESHOLD',
                'SELL_CHECK_SECONDS',
                'PRICE_MONITOR_SECONDS',
            ]
        }
    };

    // 즉시 반영되는 파라미터 목록
    const IMMEDIATE_PARAMS = [
        'BUY_AMOUNT_PER_COIN',
        'MIN_UP_PROBABILITY',
        'BUY_PROFIT_THRESHOLD',
        'BUY_WAIT_SECONDS',
        'BUY_RETRY_COUNT',
        'TARGET_MODE',
        'TAKE_PROFIT_BUFFER',
        'STOP_LOSS_THRESHOLD',
        'MIN_PROFIT_RATE',
        'MAX_PROFIT_RATE',
        'SELL_CHECK_SECONDS'
    ];

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

                // API 응답을 객체로 변환 (paramName -> configKey, paramValue -> configValue)
                configList.forEach(config => {
                    // 서버 응답 키 변경 대응
                    const key = config.configKey || config.paramName;
                    const value = config.configValue || config.paramValue;

                    if (params.hasOwnProperty(key)) {
                        configMap[key] = value;
                    }
                });

                setParams(prev => ({ ...prev, ...configMap }));
            }
        } catch (e) {
            console.error('설정값 조회 실패:', e);
            setToast('설정값을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // 입력값 검증
        const errors = [];

        // 퍼센트 값 검증 (0~100)
        const percentParams = [
            'TAKE_PROFIT_BUFFER',
            'STOP_LOSS_THRESHOLD',
            'MIN_UP_PROBABILITY',
            'MIN_PROFIT_RATE',
            'MAX_PROFIT_RATE',
            'BUY_PROFIT_THRESHOLD'
        ];
        percentParams.forEach(key => {
            const value = parseFloat(params[key]);
            if (isNaN(value) || value < 0 || value > 100) {
                errors.push(`${getParamLabel(key)}는 0~100 사이의 값이어야 합니다.`);
            }
        });

        // 숫자 값 검증
        const numericParams = [
            'BUY_AMOUNT_PER_COIN',
            'BUY_WAIT_SECONDS',
            'BUY_RETRY_COUNT',
            'SELL_CHECK_SECONDS',
            'PRICE_MONITOR_SECONDS',
            'BUY_CHECK_HOURS',
            'PREDICTION_DAYS',
        ];
        numericParams.forEach(key => {
            if (key === 'TARGET_MODE') return;
            const value = parseFloat(params[key]);
            if (isNaN(value) || value < 0) {
                errors.push(`${getParamLabel(key)}는 0 이상의 값이어야 합니다.`);
            }
        });

        if (errors.length > 0) {
            setToast(errors.join('\n'));
            return;
        }

        setSaveLoading(true);
        try {
            // API 요청 형식으로 변환 (configKey, configValue)
            const configList = Object.entries(params).map(([key, value]) => ({
                configKey: key,
                configValue: value?.toString() || ''
            }));

            const { data, error } = await send('/dart/api/cointrade/config', configList, 'PUT');

            if (error) {
                setToast('저장에 실패했습니다: ' + error);
            } else if (data?.success) {
                setToast('설정이 저장되었습니다.');
            }
        } catch (e) {
            console.error('설정 저장 실패:', e);
            setToast('설정 저장 중 오류가 발생했습니다.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('자동매매 파라미터');

            // 제목 행 추가
            ws.mergeCells('A1:E1');
            const titleCell = ws.getCell('A1');
            titleCell.value = `코인 자동매매 파라미터 설정 (${new Date().toLocaleString()})`;
            titleCell.font = { size: 16, bold: true };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(1).height = 30;

            // 헤더 행 (2행)
            const headers = ['그룹', '항목명', '설명', '설정값', '키(Key)'];
            const headerRow = ws.getRow(2);
            headerRow.values = headers;

            // 헤더 스타일
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4F81BD' } // Blueish
                };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            headerRow.height = 25;

            // 컬럼 너비 설정
            ws.getColumn(1).width = 15; // 그룹
            ws.getColumn(2).width = 25; // 항목명
            ws.getColumn(3).width = 60; // 설명
            ws.getColumn(4).width = 20; // 설정값
            ws.getColumn(5).width = 25; // 키

            let rowIndex = 3;

            Object.entries(PARAM_GROUPS).forEach(([groupKey, group]) => {
                const startRow = rowIndex;

                group.keys.forEach((key) => {
                    const row = ws.getRow(rowIndex);
                    row.values = [
                        group.label,
                        getParamLabel(key),
                        getParamDescription(key),
                        params[key],
                        key
                    ];

                    // 스타일 적용
                    row.eachCell((cell, colNumber) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                        cell.alignment = { vertical: 'middle', wrapText: true };

                        // 설정값 중앙 정렬
                        if (colNumber === 4) {
                            cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                    });

                    rowIndex++;
                });

                // 그룹 셀 병합
                if (rowIndex - startRow > 0) {
                    ws.mergeCells(`A${startRow}:A${rowIndex - 1}`);
                }
            });

            // 파일 저장
            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
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
        const labels = {
            BUY_PROFIT_THRESHOLD: '매수 조건 (기대 수익률 %)',
            TAKE_PROFIT_BUFFER: '익절 버퍼 (%)',
            STOP_LOSS_THRESHOLD: '손절선 (%)',
            BUY_AMOUNT_PER_COIN: '종목당 매수금액 (원)',
            BUY_WAIT_SECONDS: '매수 체결 대기 (초)',
            BUY_RETRY_COUNT: '매수 재시도 (회)',
            SELL_CHECK_SECONDS: '매도 체결 확인 (초)',
            PRICE_MONITOR_SECONDS: '가격 모니터링 주기 (초)',
            BUY_CHECK_HOURS: '매수 체크 주기 (시간)',
            MIN_UP_PROBABILITY: '최소 상승 확률 (%)',
            MIN_PROFIT_RATE: '최소 익절률 (%)',
            MAX_PROFIT_RATE: '최대 익절률 (%)',
            TARGET_MODE: '대상 모드 (ALL/SELECTED)',
            PREDICTION_DAYS: '예측 기간 (일)',
            TRAIN_SCHEDULE_CRON: '모델 재학습 스케줄 (Cron)',
            ENSEMBLE_MODE: '앙상블 모드',
        };
        return labels[key] || key;
    };

    const getParamDescription = (key) => {
        const descriptions = {
            BUY_PROFIT_THRESHOLD: '예측 수익률이 이 값 이상일 때 매수',
            TAKE_PROFIT_BUFFER: '예측 최고가보다 얼마나 일찍 팔까요? (추천: 3~5%)',
            STOP_LOSS_THRESHOLD: '내가 견딜 수 있는 최대 손실은 몇 %인가요? (추천: 5~10%)',
            BUY_AMOUNT_PER_COIN: '한 종목당 투자할 금액 (KRW)',
            BUY_WAIT_SECONDS: '매수 주문 후 체결 대기 시간',
            BUY_RETRY_COUNT: '매수 실패 시 재시도 횟수',
            SELL_CHECK_SECONDS: '매도 주문 체결 확인 주기',
            PRICE_MONITOR_SECONDS: '가격 모니터링 주기',
            BUY_CHECK_HOURS: '매수 조건 체크 주기 (시간)',
            MIN_UP_PROBABILITY: '상승 확률이 이 값 이상이어야 매수',
            MIN_PROFIT_RATE: '{PREDICTION_DAYS}일 이나 기다렸는데 이 정도 수익이면 충분합니다. (추천: 5%)',
            MAX_PROFIT_RATE: 'AI가 폭등을 예측해도 이 정도 수익이면 만족하고 나옵니다. (추천: 30%)',
            TARGET_MODE: 'ALL: 전체 종목 매매, SELECTED: 선택 종목만 매매',
            PREDICTION_DAYS: 'AI 모델이 예측할 미래 기간 (일 단위)',
            TRAIN_SCHEDULE_CRON: '모델 재학습 실행 주기 (예: 0 3 * * 2,5 -> 화/금 새벽 3시)',
            ENSEMBLE_MODE: '사용할 모델 모드 (lstm_only/gru_only/cnn_only/ensemble)',
        };
        return descriptions[key] || '';
    };

    return (
        <div className="container mx-auto max-w-5xl p-4">
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
                                    매매 파라미터 설정
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                        즉시 반영
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        스케줄러 재시작 없이 다음 주기부터 반영됩니다.
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleExportExcel}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm shadow-sm"
                                >
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

                                        {group.keys.map((key) => (
                                            <div key={key} className="group/row">
                                                <div
                                                    className="grid grid-cols-1 md:grid-cols-12 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors duration-150 p-4 gap-3 md:gap-0"
                                                >
                                                    {/* 항목명 & 즉시반영 배지 */}
                                                    <div className="md:col-span-3 flex flex-col justify-center gap-1">
                                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:text-base">
                                                                {getParamLabel(key)}
                                                            </span>
                                                            {IMMEDIATE_PARAMS.includes(key) && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 whitespace-nowrap">
                                                                    즉시 반영
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                                            {key}
                                                        </span>
                                                    </div>

                                                    {/* 설명 */}
                                                    <div className="md:col-span-6 flex items-center md:px-4">
                                                        <div className="text-sm text-slate-500 dark:text-slate-400 w-full">
                                                            {key === 'BUY_PROFIT_THRESHOLD' ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span>{getParamDescription(key)}</span>
                                                                    {/* 요약 버전 툴팁 (인라인 표시) */}
                                                                    <div className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 mt-1">
                                                                        <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">💡 기대 수익률이란?</strong>
                                                                        단순 목표 수익률이 아니라, <span className="text-blue-600 dark:text-blue-400">상승 잠재력(High)</span>과 <span className="text-red-600 dark:text-red-400">하락 위험(Low)</span>을 평균 낸 값입니다.
                                                                        리스크까지 고려했기 때문에, 이 값이 높을수록 '안전하게 오를 확률이 높은 종목'입니다.
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                getParamDescription(key)
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 입력 필드 */}
                                                    <div className="md:col-span-3 flex items-center">
                                                        {key === 'TARGET_MODE' ? (
                                                            <select
                                                                value={params[key]}
                                                                onChange={(e) => handleInputChange(key, e.target.value)}
                                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                                            >
                                                                <option value="ALL">ALL (전체)</option>
                                                                <option value="SELECTED">SELECTED (선택)</option>
                                                            </select>
                                                        ) : key === 'ENSEMBLE_MODE' ? (
                                                            <select
                                                                value={params[key]}
                                                                onChange={(e) => handleInputChange(key, e.target.value)}
                                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                                                            >
                                                                <option value="ensemble">ensemble</option>
                                                                <option value="lstm_only">lstm_only</option>
                                                                <option value="gru_only">gru_only</option>
                                                                <option value="cnn_only">cnn_only</option>
                                                            </select>
                                                        ) : (
                                                            <Input
                                                                type={key === 'TRAIN_SCHEDULE_CRON' ? 'text' : 'number'}
                                                                className="w-full h-10 md:h-9 dark:!bg-slate-600 dark:placeholder-slate-300"
                                                                value={params[key]}
                                                                onChange={(e) => handleInputChange(key, e.target.value)}
                                                                placeholder={key === 'TRAIN_SCHEDULE_CRON' ? '0 3 * * 2,5' : '0'}
                                                                step={
                                                                    key === 'TRAIN_SCHEDULE_CRON' ? undefined :
                                                                        key === 'BUY_AMOUNT_PER_COIN' ? '1000' :
                                                                            key.includes('THRESHOLD') || key.includes('BUFFER') ? '0.1' :
                                                                                '1'
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 기대 수익률 계산기 (BUY_PROFIT_THRESHOLD 일 때만 표시) */}
                                                {key === 'BUY_PROFIT_THRESHOLD' && (
                                                    <div className="bg-slate-50 dark:bg-slate-900/30 border-t border-dashed border-slate-200 dark:border-slate-700 p-3 mx-4 mb-2 rounded-b-lg">
                                                        <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
                                                            <span className="font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">🧮 간편 계산기</span>
                                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                                <input
                                                                    type="number"
                                                                    placeholder="예상 최고가(%)"
                                                                    className="w-full sm:w-36 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    value={calcHigh}
                                                                    onChange={(e) => setCalcHigh(e.target.value)}
                                                                />
                                                                <span className="text-slate-400">-</span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="예상 하락률(%)"
                                                                    className="w-full sm:w-36 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    value={calcLow}
                                                                    onChange={(e) => setCalcLow(e.target.value)}
                                                                />
                                                                <span className="text-slate-400">/ 2 =</span>
                                                                <span className="font-bold text-blue-600 dark:text-blue-400 ml-1">
                                                                    {calcHigh && calcLow ? ((parseFloat(calcHigh) - parseFloat(calcLow)) / 2).toFixed(2) : '?'}%
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-slate-500 ml-auto hidden sm:block">
                                                                * 하락률은 양수로 입력 (예: 10% 하락 예상 시 10 입력)
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
                                                            className="px-6 py-2"
                                                        >
                                                            {saveLoading ? '저장 중...' : '저장'}
                                                        </Button>
                                                    </div>
                </>
            )}

            {/* Toast 메시지 */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
                    <div className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
                        <p className="text-sm whitespace-pre-line">{toast}</p>
                    </div>
                </div>
            )}

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
        </div>
    );
}
