import { fmtUsd } from '../utils/formatters';

/**
 * 거래 합계 요약
 */
export function TransactionSummary({ buySum, curSum, diff, diffPct, fx }) {
    const isProfit = diff >= 0;

    return (
        <div className="mt-4 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* 좌측: 매수금액 & 현재가치 */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <div>
                        <div className="text-xs text-slate-500 mb-1 font-medium">총 매수금액</div>
                        <div className="text-lg font-bold text-slate-800">
                            $ {fmtUsd(buySum)}
                        </div>
                        {fx && (
                            <div className="text-xs text-slate-500 mt-0.5">
                                ≈ ₩{Math.round(buySum * fx).toLocaleString()}
                            </div>
                        )}
                    </div>

                    <div className="hidden sm:block w-px bg-slate-300"></div>

                    <div>
                        <div className="text-xs text-slate-500 mb-1 font-medium">총 현재가치</div>
                        <div className="text-lg font-bold text-slate-800">
                            $ {fmtUsd(curSum)}
                        </div>
                        {fx && (
                            <div className="text-xs text-slate-500 mt-0.5">
                                ≈ ₩{Math.round(curSum * fx).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* 우측: 손익 */}
                <div className={`px-5 py-3 rounded-lg ${
                    isProfit
                        ? 'bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200'
                        : 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200'
                }`}>
                    <div className="text-xs font-medium mb-1 text-slate-600">손익</div>
                    <div className={`text-xl font-bold ${isProfit ? 'text-rose-600' : 'text-blue-600'}`}>
                        {isProfit ? '+' : ''}$ {fmtUsd(diff)}
                        <span className="text-sm ml-2">
                            ({isProfit ? '+' : ''}{diffPct.toFixed(2)}%)
                        </span>
                    </div>
                    {fx && (
                        <div className={`text-xs mt-1 ${isProfit ? 'text-rose-700' : 'text-blue-700'}`}>
                            {isProfit ? '+' : ''}₩{Math.round(diff * fx).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
