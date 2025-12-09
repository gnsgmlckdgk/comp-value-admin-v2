import { TABLE_HEADERS } from '../constants';

/**
 * 거래 테이블 헤더
 */
export function TransactionTableHeader({ sortConfig, onSort }) {
    // 정렬 가능한 컬럼 인덱스 (No와 작업 제외)
    const sortableColumns = [1, 2, 3, 4, 7, 8, 9, 10, 11, 12]; // 티커, 기업명, 매수일자, 매수가격, 총매수금액, 총현재가치, 현재가격, 매도목표가, 단일가격차, 총가격차

    const handleHeaderClick = (idx) => {
        if (!sortableColumns.includes(idx)) return;
        onSort(idx);
    };

    const getSortIcon = (idx) => {
        if (!sortableColumns.includes(idx)) return null;
        if (sortConfig.column !== idx) {
            return <span className="ml-1 text-slate-400">⇅</span>;
        }
        return sortConfig.direction === 'asc'
            ? <span className="ml-1">▲</span>
            : <span className="ml-1">▼</span>;
    };

    return (
        <thead>
            <tr className="bg-gradient-to-b from-slate-700 to-slate-600 text-white text-xs md:text-sm sticky top-0 z-20 shadow-md">
                {TABLE_HEADERS.map((h, idx) => (
                    <th
                        key={h}
                        onClick={() => handleHeaderClick(idx)}
                        className={`px-3 py-3 text-center font-semibold border-b-2 border-slate-500 whitespace-nowrap sticky top-0 ${
                            idx === 0 ? 'left-0 z-30 bg-gradient-to-b from-slate-700 to-slate-600' :
                            idx === 1 ? 'left-12 z-30 bg-gradient-to-b from-slate-700 to-slate-600' :
                            'z-20 bg-gradient-to-b from-slate-700 to-slate-600'
                        } ${sortableColumns.includes(idx) ? 'cursor-pointer hover:bg-slate-600 select-none' : ''}`}
                        title={sortableColumns.includes(idx) ? '클릭하여 정렬' : ''}
                    >
                        <div className="flex items-center justify-center">
                            {typeof h === 'string' && h.includes('\n') ? (
                                <div className="leading-tight">
                                    {h.split('\n').map((line, i2) => (
                                        <div key={i2} className={i2 === 1 ? 'text-[11px] font-normal text-slate-300' : ''}>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span>{h}</span>
                            )}
                            {getSortIcon(idx)}
                        </div>
                    </th>
                ))}
            </tr>
        </thead>
    );
}
