/**
 * 거래 페이지 헤더
 */
export function TransactionHeader({ loading, rows, lastUpdated, fxRate, onRefresh }) {
    return (
        <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="hidden md:block" />
            <div className="flex items-center gap-3 text-sm">
                <button
                    onClick={onRefresh}
                    className="rounded-md border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                    disabled={loading || rows.length === 0}
                >
                    {loading ? '갱신 중...' : '현재가격 갱신'}
                </button>
                <span className="text-slate-500">
                    {lastUpdated ? `갱신: ${new Date(lastUpdated).toLocaleString()}` : '갱신 정보 없음'}
                </span>
                <span className="text-slate-500">
                    {fxRate ? `환율: 1 USD ≈ ${Math.round(fxRate).toLocaleString()}원` : '환율 정보 없음'}
                </span>
            </div>
        </div>
    );
}
