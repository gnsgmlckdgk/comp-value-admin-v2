import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';

/**
 * 코인 자동매매 파라미터 설정 페이지
 */
export default function CointradeConfig() {
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 파라미터 상태 (9개만 표시)
    const [params, setParams] = useState({
        BUY_PROFIT_THRESHOLD: '',     // X% (매수 조건)
        TAKE_PROFIT_BUFFER: '',        // A% (익절 버퍼)
        STOP_LOSS_THRESHOLD: '',       // C% (손절선)
        BUY_AMOUNT_PER_COIN: '',       // P원 (종목당 매수금액)
        BUY_WAIT_SECONDS: '',          // Y초 (매수 체결 대기)
        BUY_RETRY_COUNT: '',           // Z회 (매수 재시도)
        SELL_CHECK_SECONDS: '',        // B초 (매도 체결 확인)
        PRICE_MONITOR_SECONDS: '',     // D초 (가격 모니터링)
        BUY_CHECK_HOURS: '',           // E시간 (매수 체크 주기)
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
        const percentParams = ['BUY_PROFIT_THRESHOLD', 'TAKE_PROFIT_BUFFER', 'STOP_LOSS_THRESHOLD'];
        percentParams.forEach(key => {
            const value = parseFloat(params[key]);
            if (isNaN(value) || value < 0 || value > 100) {
                errors.push(`${getParamLabel(key)}는 0~100 사이의 값이어야 합니다.`);
            }
        });

        // 양수 값 검증
        const positiveParams = [
            'BUY_AMOUNT_PER_COIN',
            'BUY_WAIT_SECONDS',
            'BUY_RETRY_COUNT',
            'SELL_CHECK_SECONDS',
            'PRICE_MONITOR_SECONDS',
            'BUY_CHECK_HOURS'
        ];
        positiveParams.forEach(key => {
            const value = parseFloat(params[key]);
            if (isNaN(value) || value <= 0) {
                errors.push(`${getParamLabel(key)}는 0보다 큰 값이어야 합니다.`);
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
                paramValue: paramValue.toString()
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
        };
        return descriptions[key] || '';
    };

    return (
        <div className="container mx-auto max-w-4xl p-4">
            <PageTitle>자동매매 파라미터 설정</PageTitle>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-slate-600 dark:text-slate-400">로딩 중...</div>
                </div>
            ) : (
                <>
                    {/* 매매 파라미터 설정 섹션 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-6">
                            매매 파라미터 설정
                        </h2>

                        <div className="space-y-6">
                            {Object.keys(params).map((key) => (
                                <div key={key} className="flex flex-col md:flex-row md:items-start gap-3">
                                    <div className="w-full md:w-2/5">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            {getParamLabel(key)}
                                        </label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {getParamDescription(key)}
                                        </p>
                                    </div>
                                    <div className="w-full md:w-3/5">
                                        <Input
                                            type="number"
                                            className="w-full"
                                            value={params[key]}
                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                            placeholder="0"
                                            step={
                                                key === 'BUY_AMOUNT_PER_COIN' ? '1000' :
                                                key.includes('THRESHOLD') || key.includes('BUFFER') ? '0.1' :
                                                '1'
                                            }
                                        />
                                    </div>
                                </div>
                            ))}
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
        </div>
    );
}
