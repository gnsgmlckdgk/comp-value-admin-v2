import { TABLE_HEADERS } from '../constants';

/**
 * 거래 테이블 헤더
 */
export function TransactionTableHeader() {
    return (
        <thead>
            <tr className="bg-gradient-to-b from-slate-700 to-slate-600 text-white text-xs md:text-sm sticky top-0 z-20 shadow-md">
                {TABLE_HEADERS.map((h, idx) => (
                    <th
                        key={h}
                        className={`px-3 py-3 text-center font-semibold border-b-2 border-slate-500 whitespace-nowrap sticky top-0 ${
                            idx === 0 ? 'left-0 z-30 bg-gradient-to-b from-slate-700 to-slate-600' :
                            idx === 1 ? 'left-12 z-30 bg-gradient-to-b from-slate-700 to-slate-600' :
                            'z-20 bg-gradient-to-b from-slate-700 to-slate-600'
                        }`}
                    >
                        {typeof h === 'string' && h.includes('\n') ? (
                            <div className="leading-tight">
                                {h.split('\n').map((line, i2) => (
                                    <div key={i2} className={i2 === 1 ? 'text-[11px] font-normal text-slate-300' : ''}>
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
