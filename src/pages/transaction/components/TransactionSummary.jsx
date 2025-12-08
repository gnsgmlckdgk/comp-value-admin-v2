import { fmtUsd } from '../utils/formatters';

/**
 * 거래 합계 요약
 */
export function TransactionSummary({ buySum, curSum, diff, diffPct, fx }) {
    const isProfit = diff >= 0;

    return (
        <div className="mt-4 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-5 shadow-sm dark:from-slate-800 dark:to-slate-800 dark:border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* 좌측: 매수금액 & 현재가치 */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div>
                        <div className="text-xs text-slate-500 mb-1 font-medium dark:text-slate-400">총 매수금액</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-white">
                            $ {fmtUsd(buySum)}
                        </div>
                        {fx && (
                            <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                                ≈ ₩{Math.round(buySum * fx).toLocaleString()}
                            </div>
                        )}
                    </div>

                    <div className="hidden sm:block w-px bg-slate-300 dark:bg-slate-600"></div>

                    <div>
                        <div className="text-xs text-slate-500 mb-1 font-medium dark:text-slate-400">총 현재가치</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-white">
                            $ {fmtUsd(curSum)}
                        </div>
                        {fx && (
                            <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                                ≈ ₩{Math.round(curSum * fx).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* 우측: 손익 */}
                <div className={`px-5 py-3 rounded-lg ${
                    isProfit
                        ? 'bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 dark:from-rose-900/30 dark:to-rose-900/20 dark:border-rose-800'
                        : 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 dark:from-blue-900/30 dark:to-blue-900/20 dark:border-blue-800'
                }`}>
                    <div className="text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">손익</div>
                    <div className={`text-xl font-bold ${isProfit ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {isProfit ? '+' : ''}$ {fmtUsd(diff)}
                        <span className="text-sm ml-2">
                            ({isProfit ? '+' : ''}{diffPct.toFixed(2)}%)
                        </span>
                    </div>
                    {fx && (
                        <div className={`text-xs mt-1 ${isProfit ? 'text-rose-700 dark:text-rose-400' : 'text-blue-700 dark:text-blue-400'}`}>
                            {isProfit ? '+' : ''}₩{Math.round(diff * fx).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
