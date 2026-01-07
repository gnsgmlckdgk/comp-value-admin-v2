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
            return (
                <span className="ml-1.5 opacity-40 group-hover:opacity-70 transition-opacity">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                </span>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <span className="ml-1.5 text-amber-300">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
            </span>
        ) : (
            <span className="ml-1.5 text-amber-300">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </span>
        );
    };

    // sticky 컬럼 배경 스타일
    const getStickyBg = (idx) => {
        if (idx === 0) return 'left-0 z-30';
        if (idx === 1) return 'left-12 z-30';
        return 'z-20';
    };

    return (
        <thead>
            <tr className="bg-slate-800 text-white text-xs sticky top-0 z-20 dark:bg-slate-900">
                {TABLE_HEADERS.map((h, idx) => (
                    <th
                        key={h}
                        onClick={() => handleHeaderClick(idx)}
                        className={`
                            group px-3 py-3.5 text-center font-medium tracking-wide whitespace-nowrap sticky top-0
                            border-b border-slate-600 dark:border-slate-700
                            ${getStickyBg(idx)} bg-slate-800 dark:bg-slate-900
                            ${sortableColumns.includes(idx)
                                ? 'cursor-pointer hover:bg-slate-700 dark:hover:bg-slate-800 select-none transition-colors'
                                : ''
                            }
                        `}
                        title={sortableColumns.includes(idx) ? '클릭하여 정렬' : ''}
                    >
                        <div className="flex items-center justify-center">
                            {typeof h === 'string' && h.includes('\n') ? (
                                <div className="leading-snug">
                                    {h.split('\n').map((line, i2) => (
                                        <div
                                            key={i2}
                                            className={i2 === 1 ? 'text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5' : ''}
                                        >
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
