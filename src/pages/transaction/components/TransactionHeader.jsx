import Button from '@/component/common/button/Button';

/**
 * 거래 페이지 헤더 (액션 버튼만)
 */
export function TransactionHeader({ loading, rows, onRefresh, onAddClick, onExcelDownload, lastRefreshedAt }) {
    return (
        <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
                <Button onClick={onAddClick}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>종목 추가</span>
                </Button>
                <Button variant="success" onClick={onExcelDownload} disabled={rows.length === 0}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>엑셀 다운로드</span>
                </Button>
            </div>
            <div className="flex flex-col items-end gap-1">
                <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading || rows.length === 0}>
                    {loading ? '갱신 중...' : '현재가격 갱신'}
                </Button>
                {lastRefreshedAt && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {lastRefreshedAt.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>
                )}
            </div>
        </div>
    );
}
