import { TABLE_HEADERS, SORTABLE_COLUMNS } from '../constants';

/**
 * 거래 테이블 헤더
 */
export function TransactionTableHeader({ sortConfig, onSort }) {
    const handleHeaderClick = (idx) => {
        if (!SORTABLE_COLUMNS.includes(idx)) return;
        onSort(idx);
    };

    const getSortIcon = (idx) => {
        if (!SORTABLE_COLUMNS.includes(idx)) return null;
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

    const getStickyStyle = (idx) => {
        if (idx === 0) return 'left-0 z-30';
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
                            ${getStickyStyle(idx)} bg-slate-800 dark:bg-slate-900
                            ${SORTABLE_COLUMNS.includes(idx)
                                ? 'cursor-pointer hover:bg-slate-700 dark:hover:bg-slate-800 select-none transition-colors'
                                : ''
                            }
                        `}
                        title={SORTABLE_COLUMNS.includes(idx) ? '클릭하여 정렬' : ''}
                    >
                        <div className="flex items-center justify-center">
                            <span>{h}</span>
                            {getSortIcon(idx)}
                        </div>
                    </th>
                ))}
            </tr>
        </thead>
    );
}
