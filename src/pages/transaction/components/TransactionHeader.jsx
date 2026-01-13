/**
 * 거래 페이지 헤더
 */
export function TransactionHeader({ loading, rows, lastUpdated, fxRate, onRefresh, onAddClick, onExcelDownload }) {
    // 투자 종목 개수 계산 (symbol 기준 중복 제거)
    const uniqueSymbols = new Set(rows.map(row => row.symbol)).size;

    return (
        <div className="mb-3 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onAddClick}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-lg hover:from-sky-600 hover:to-indigo-600 transition-all shadow-sm font-medium text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>종목 추가</span>
                    </button>
                    <button
                        onClick={onExcelDownload}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={rows.length === 0}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>엑셀 다운로드</span>
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

            {/* 데이터 통계 정보 */}
            <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg dark:bg-slate-700">
                    <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                        투자 종목: <span className="text-blue-600 dark:text-blue-400">{uniqueSymbols}개</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg dark:bg-slate-700">
                    <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                        매수 건수: <span className="text-green-600 dark:text-green-400">{rows.length}건</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
