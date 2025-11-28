import { TABLE_HEADERS } from '../constants';

/**
 * 거래 테이블 헤더
 */
export function TransactionTableHeader() {
    return (
        <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs md:text-sm sticky top-0 z-20">
                {TABLE_HEADERS.map((h, idx) => (
                    <th
                        key={h}
                        className={`px-3 py-2 text-center font-medium border-b border-slate-200 whitespace-nowrap sticky top-0 bg-slate-50 ${
                            idx === 0 ? 'left-0 z-30' : idx === 1 ? 'left-12 z-30' : 'z-20'
                        }`}
                    >
                        {typeof h === 'string' && h.includes('\n') ? (
                            <div className="leading-tight">
                                {h.split('\n').map((line, i2) => (
                                    <div key={i2} className={i2 === 1 ? 'text-[11px] font-normal text-slate-500' : ''}>
                                        {line}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            h
                        )}
                    </th>
                ))}
            </tr>
        </thead>
    );
}
