/**
 * 거래 페이지 헤더 (액션 버튼만)
 */
export function TransactionHeader({ loading, rows, onRefresh, onAddClick, onExcelDownload }) {
    return (
        <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
            <button
                onClick={onRefresh}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                disabled={loading || rows.length === 0}
            >
                {loading ? '갱신 중...' : '현재가격 갱신'}
            </button>
        </div>
    );
}
