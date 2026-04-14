import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Loading from '@/component/common/display/Loading';

/** 천단위 콤마 포맷 (소수점 보존) */
const formatNumber = (value) => {
    if (!value && value !== 0) return '';
    const parts = String(value).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
};

/** 콤마 제거 → 숫자 변환 */
const parseNumber = (str) => {
    if (!str) return NaN;
    return parseFloat(str.replace(/,/g, ''));
};

/** 숫자 + 콤마 + 소수점만 허용하는 정규식 */
const VALID_INPUT = /^[0-9,.]*$/;

export default function ExchangeRate() {
    const [krwDisplay, setKrwDisplay] = useState('');
    const [usdDisplay, setUsdDisplay] = useState('');
    const [rate, setRate] = useState(null);
    const [updatedAt, setUpdatedAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchRate = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: apiError } = await send('/dart/tranrecord/rate', { currency: 'USDKRW' }, 'POST');
            if (apiError) {
                setError(`환율 조회 실패: ${apiError}`);
                return;
            }
            if (!data?.success) {
                setError('환율 조회 실패: 서버 응답 오류');
                return;
            }
            const newRate = data.response.rate;
            setRate(newRate);
            setUpdatedAt(data.response.updatedAt);

            // 기존 입력값이 있으면 새 환율로 재계산 (KRW 기준)
            if (krwDisplay) {
                const krw = parseNumber(krwDisplay);
                if (!isNaN(krw)) {
                    setUsdDisplay(formatNumber((krw / newRate).toFixed(2)));
                }
            }
        } catch (err) {
            setError(`환율 조회 중 오류 발생: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [krwDisplay]);

    useEffect(() => {
        fetchRate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleKrwChange = (e) => {
        const raw = e.target.value;
        if (!VALID_INPUT.test(raw)) return;

        // 빈 입력
        if (!raw) {
            setKrwDisplay('');
            setUsdDisplay('');
            return;
        }

        const num = parseNumber(raw);
        if (isNaN(num)) return;

        // KRW는 정수 표시이므로 소수점 입력 허용하되 표시는 콤마만
        setKrwDisplay(formatNumber(raw.replace(/,/g, '')));

        if (rate) {
            const usd = num / rate;
            setUsdDisplay(formatNumber(usd.toFixed(2)));
        }
    };

    const handleUsdChange = (e) => {
        const raw = e.target.value;
        if (!VALID_INPUT.test(raw)) return;

        if (!raw) {
            setKrwDisplay('');
            setUsdDisplay('');
            return;
        }

        const num = parseNumber(raw);
        if (isNaN(num)) return;

        setUsdDisplay(formatNumber(raw.replace(/,/g, '')));

        if (rate) {
            const krw = num * rate;
            setKrwDisplay(formatNumber(Math.round(krw).toString()));
        }
    };

    return (
        <div>
            <PageTitle />
            <Loading show={loading} />

            {/* 에러 메시지 */}
            {error && (
                <div className="mb-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {error}
                </div>
            )}

            {/* 메인 카드 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                {/* 환율 정보 헤더 */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            USD/KRW 환율
                        </h2>
                        {rate && (
                            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                                {formatNumber(rate.toFixed(2))}
                                <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">원</span>
                            </p>
                        )}
                        {updatedAt && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                기준시각: {updatedAt}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={fetchRate}
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        환율 새로고침
                    </button>
                </div>

                {/* 환산 입력 영역 */}
                <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
                    {/* KRW 입력 */}
                    <div className="w-full flex-1">
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            원화 (KRW)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400 dark:text-slate-500">
                                ₩
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={krwDisplay}
                                onChange={handleKrwChange}
                                placeholder="0"
                                disabled={!rate}
                                className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-9 pr-4 text-right text-lg font-medium text-slate-900 transition-colors placeholder:text-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400"
                            />
                        </div>
                    </div>

                    {/* 화살표 아이콘 */}
                    <div className="flex shrink-0 items-center justify-center pt-0 md:pt-6">
                        <div className="rounded-full bg-sky-100 p-2 dark:bg-sky-900/40">
                            <ArrowLeftRight className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        </div>
                    </div>

                    {/* USD 입력 */}
                    <div className="w-full flex-1">
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            달러 (USD)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400 dark:text-slate-500">
                                $
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={usdDisplay}
                                onChange={handleUsdChange}
                                placeholder="0.00"
                                disabled={!rate}
                                className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-9 pr-4 text-right text-lg font-medium text-slate-900 transition-colors placeholder:text-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400"
                            />
                        </div>
                    </div>
                </div>

                {/* 환산 요약 (입력값이 있을 때) */}
                {rate && krwDisplay && usdDisplay && (
                    <div className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-center text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                        ₩ {krwDisplay} = $ {usdDisplay}
                    </div>
                )}
            </div>
        </div>
    );
}
