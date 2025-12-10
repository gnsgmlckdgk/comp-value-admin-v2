/**
 * 거래 페이지 헤더
 */
export function TransactionHeader({ loading, rows, lastUpdated, fxRate, onRefresh, onAddClick }) {
    return (
        <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
                <button
                    onClick={onAddClick}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-lg hover:from-sky-600 hover:to-indigo-600 transition-all shadow-sm font-medium text-sm"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>종목 추가</span>
                </button>
            </div>
            <div className="flex items-center gap-3 text-sm">
                <button
                    onClick={onRefresh}
                    className="rounded-md border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    disabled={loading || rows.length === 0}
                >
                    {loading ? '갱신 중...' : '현재가격 갱신'}
                </button>
                <span className="text-slate-500 dark:text-slate-400">
                    {lastUpdated ? `갱신: ${new Date(lastUpdated).toLocaleString()}` : '갱신 정보 없음'}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                    {fxRate ? `환율: 1 USD ≈ ${Number(fxRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원` : '환율 정보 없음'}
                </span>
            </div>
        </div>
    );
}
