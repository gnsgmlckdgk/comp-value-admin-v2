import { useState, useEffect, Fragment } from 'react';
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

    // 파라미터 상태
    const [params, setParams] = useState({
        BUY_PROFIT_THRESHOLD: '',      // X% (매수 조건)
        TAKE_PROFIT_BUFFER: '',        // A% (익절 버퍼)
        STOP_LOSS_THRESHOLD: '',       // C% (손절선)
        BUY_AMOUNT_PER_COIN: '',       // P원 (종목당 매수금액)
        BUY_WAIT_SECONDS: '',          // Y초 (매수 체결 대기)
        BUY_RETRY_COUNT: '',           // Z회 (매수 재시도)
        SELL_CHECK_SECONDS: '',        // B초 (매도 체결 확인)
        PRICE_MONITOR_SECONDS: '',     // D초 (가격 모니터링)
        BUY_CHECK_HOURS: '',           // E시간 (매수 체크 주기)
        MIN_SURGE_PROBABILITY: '',     // S% 최소 급등 확률 (0~100)
        HOLD_GRACE_DAYS: '',           // 보유 유예일 (1~7)
        SURGE_THRESHOLD: '',           // 급등 기준 (%)
        MIN_BUY_SCORE: '',             // 최소 매수 점수 (0~100)
        TARGET_MODE: 'ALL',            // ALL 또는 SELECTED 모드
    });

    // 파라미터 그룹 정의
    const PARAM_GROUPS = {
        BUY: {
            label: '매수 관련',
            keys: [
                'BUY_AMOUNT_PER_COIN',
                'BUY_PROFIT_THRESHOLD',
                'MIN_SURGE_PROBABILITY',
                'MIN_BUY_SCORE',
                'BUY_WAIT_SECONDS',
                'BUY_RETRY_COUNT',
                'BUY_CHECK_HOURS',
                'TARGET_MODE'
            ]
        },
        SELL: {
            label: '매도 관련',
            keys: [
                'TAKE_PROFIT_BUFFER',
                'STOP_LOSS_THRESHOLD',
                'SELL_CHECK_SECONDS',
                'HOLD_GRACE_DAYS',
                'PRICE_MONITOR_SECONDS',
                'SURGE_THRESHOLD'
            ]
        }
    };

    // 즉시 반영되는 파라미터 목록
    const IMMEDIATE_PARAMS = [
        'BUY_AMOUNT_PER_COIN',
        'BUY_PROFIT_THRESHOLD',
        'MIN_SURGE_PROBABILITY',
        'MIN_BUY_SCORE',
        'BUY_WAIT_SECONDS',
        'BUY_RETRY_COUNT',
        'TARGET_MODE',
        'TAKE_PROFIT_BUFFER',
        'STOP_LOSS_THRESHOLD',
        'SURGE_THRESHOLD',
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

                // API 응답을 객체로 변환
                configList.forEach(config => {
                    if (params.hasOwnProperty(config.paramName)) {
                        configMap[config.paramName] = config.paramValue;
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
        const percentParams = ['BUY_PROFIT_THRESHOLD', 'TAKE_PROFIT_BUFFER', 'STOP_LOSS_THRESHOLD', 'MIN_SURGE_PROBABILITY', 'MIN_BUY_SCORE'];
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
            'SURGE_THRESHOLD',
            'HOLD_GRACE_DAYS'
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
            // API 요청 형식으로 변환
            const configList = Object.entries(params).map(([paramName, paramValue]) => ({
                paramName,
                paramValue: paramValue?.toString() || ''
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

    const handleInputChange = (key, value) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const getParamLabel = (key) => {
        const labels = {
            BUY_PROFIT_THRESHOLD: 'X% (매수 조건)',
            TAKE_PROFIT_BUFFER: 'A% (익절 버퍼)',
            STOP_LOSS_THRESHOLD: 'C% (손절선)',
            BUY_AMOUNT_PER_COIN: 'P원 (종목당 매수금액)',
            BUY_WAIT_SECONDS: 'Y초 (매수 체결 대기)',
            BUY_RETRY_COUNT: 'Z회 (매수 재시도)',
            SELL_CHECK_SECONDS: 'B초 (매도 체결 확인)',
            PRICE_MONITOR_SECONDS: 'D초 (가격 모니터링)',
            BUY_CHECK_HOURS: 'E시간 (매수 체크 주기)',
            MIN_SURGE_PROBABILITY: 'S% (최소 급등 확률)',
            HOLD_GRACE_DAYS: '보유 유예일 (일반)',
            SURGE_THRESHOLD: '급등 기준',
            MIN_BUY_SCORE: '최소 매수 점수',
            TARGET_MODE: '대상 모드 (ALL/SELECTED)',
        };
        return labels[key] || key;
    };

    const getParamDescription = (key) => {
        const descriptions = {
            BUY_PROFIT_THRESHOLD: '예측 수익률이 X% 이상일 때 매수',
            TAKE_PROFIT_BUFFER: '예측 고점 대비 A% 하락 시 익절',
            STOP_LOSS_THRESHOLD: '매수가 대비 C% 하락 시 손절',
            BUY_AMOUNT_PER_COIN: '한 종목당 투자할 금액 (KRW)',
            BUY_WAIT_SECONDS: '매수 주문 후 체결 대기 시간',
            BUY_RETRY_COUNT: '매수 실패 시 재시도 횟수',
            SELL_CHECK_SECONDS: '매도 주문 체결 확인 주기',
            PRICE_MONITOR_SECONDS: '가격 모니터링 주기',
            BUY_CHECK_HOURS: '매수 조건 체크 주기 (시간)',
            MIN_SURGE_PROBABILITY: '급등 확률이 이 값 이상이어야 매수',
            HOLD_GRACE_DAYS: '급등 예상일 경과 후 추가 보유 기간',
            SURGE_THRESHOLD: '이 % 이상 상승을 급등으로 판단',
            MIN_BUY_SCORE: '매수 점수가 이 값 이상이어야 매수',
            TARGET_MODE: 'ALL: 전체 종목 매매, SELECTED: 선택 종목만 매매',
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
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                매매 파라미터 설정
                            </h2>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 justify-end">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                        즉시 반영
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        스케줄러 재시작 없이 다음 주기부터 반영됩니다.
                                    </span>
                                </div>
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
                                            <div
                                                key={key}
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

                                                {/* 설명 - 모바일에서는 항목명 아래, 데스크톱에서는 중앙 */}
                                                <div className="md:col-span-6 flex items-center md:px-4">
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                                        {getParamDescription(key)}
                                                    </span>
                                                </div>

                                                {/* 입력 필드 */}
                                                <div className="md:col-span-3 flex items-center">
                                                    {key === 'TARGET_MODE' ? (
                                                        <select
                                                            value={params[key]}
                                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                        >
                                                            <option value="ALL">ALL (전체)</option>
                                                            <option value="SELECTED">SELECTED (선택)</option>
                                                        </select>
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            className="w-full h-10 md:h-9"
                                                            value={params[key]}
                                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                                            placeholder="0"
                                                            step={
                                                                key === 'BUY_AMOUNT_PER_COIN' ? '1000' :
                                                                    key.includes('THRESHOLD') || key.includes('BUFFER') ? '0.1' :
                                                                        '1'
                                                            }
                                                        />
                                                    )}
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
