import { toNum, fmtUsd, fmtDate } from '../utils/formatters';

/**
 * 기본 테이블 셀 컴포넌트
 */
export function Td({ children, className = '' }) {
    return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

/**
 * KRW 표시 셀
 */
export function KrwCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="h-9 flex items-center justify-end text-slate-600 dark:text-slate-300 tabular-nums">
                {v ? `₩ ${Math.round(v).toLocaleString()}` : ''}
            </div>
        </Td>
    );
}

/**
 * USD 표시 셀
 */
export function UsdCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="h-9 flex items-center justify-end text-slate-700 dark:text-slate-200 tabular-nums">
                {v ? `$ ${fmtUsd(v)}` : ''}
            </div>
        </Td>
    );
}

/**
 * USD + KRW 통합 표시 셀
 */
export function CombinedPriceCell({ usdValue, fx, bold = false }) {
    const usd = toNum(usdValue);
    const krw = fx ? Math.round(usd * fx) : 0;

    return (
        <Td>
            <div className="leading-tight text-right">
                <div className={`text-slate-700 dark:text-slate-200 tabular-nums ${bold ? 'font-bold' : 'font-medium'}`}>
                    {usd ? `$ ${fmtUsd(usd)}` : ''}
                </div>
                {usd && fx ? (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                        {`₩ ${krw.toLocaleString()}`}
                    </div>
                ) : null}
            </div>
        </Td>
    );
}

/**
 * 가격 차이 표시 셀 (단일)
 */
export function DiffCell({ buy, cur, fx }) {
    const b = toNum(buy);
    const c = toNum(cur);
    const d = c - b; // per-share diff USD
    const dKrw = fx ? Math.round(d * fx) : 0;
    const pct = b > 0 ? (d / b) * 100 : 0;
    const pos = d >= 0;
    const cls = pos
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-blue-600 dark:text-blue-400';

    return (
        <Td>
            <div className="leading-tight text-center">
                <div className={`${cls} font-semibold tabular-nums`}>
                    {(pos ? '+' : '') + '$ ' + fmtUsd(d)}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {fx ? `₩ ${dKrw.toLocaleString()}` : ''}
                </div>
                <div className={`${cls} text-[12px] font-medium tabular-nums`}>
                    {(pos ? '+' : '') + pct.toFixed(2)}%
                </div>
            </div>
        </Td>
    );
}

/**
 * 총 가격 차이 표시 셀
 */
export function TotalDiffCell({ buy, cur, qty, fx }) {
    const b = toNum(buy);
    const c = toNum(cur);
    const q = toNum(qty);
    const buySum = b * q;
    const curSum = c * q;
    const d = curSum - buySum; // total diff USD
    const dKrw = fx ? Math.round(d * fx) : 0;
    const pct = buySum > 0 ? (d / buySum) * 100 : 0;
    const pos = d >= 0;
    const cls = pos
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-blue-600 dark:text-blue-400';

    return (
        <Td>
            <div className="leading-tight text-center">
                <div className={`${cls} font-semibold tabular-nums`}>
                    {(pos ? '+' : '') + '$ ' + fmtUsd(d)}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    {fx ? `₩ ${dKrw.toLocaleString()}` : ''}
                </div>
                <div className={`${cls} text-[12px] font-medium tabular-nums`}>
                    {(pos ? '+' : '') + pct.toFixed(2)}%
                </div>
            </div>
        </Td>
    );
}

/**
 * 편집 가능한 테이블 셀
 */
export function EditableTd({
    row,
    field,
    value,
    startEdit,
    editing,
    setEditing,
    draft,
    setDraft,
    commitEdit,
    type = 'text',
    tdClassName = ''
}) {
    const isEdit = editing && editing.id === row.id && editing.field === field;

    if (!isEdit) {
        const isMoney = field.toLowerCase().includes('price');
        const isDate = field === 'buyDate';
        const isRmk = field === 'rmk';
        const main = isMoney ? `$ ${fmtUsd(value)}` : isDate ? fmtDate(value) : (value ?? '');

        // 매도목표가 셀: 현재가와의 차이를 보조 줄에 표시
        let subTargetDiff = null;
        if (field === 'targetPrice') {
            const cur = toNum(row.currentPrice);
            const tgt = toNum(value);
            if (cur || tgt) {
                const d = cur - tgt; // 현재가 - 목표가
                const pos = d >= 0;
                const cls = pos
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-blue-600 dark:text-blue-400';
                subTargetDiff = (
                    <div className={`${cls} text-[11px] tabular-nums`}>
                        {`(${pos ? '+' : ''}$ ${fmtUsd(d)})`}
                    </div>
                );
            }
        }

        const isTwoLine = field === 'targetPrice' && !!subTargetDiff;
        const isCompanyName = field === 'companyName';
        const isSymbol = field === 'symbol';

        // 툴팁 텍스트 결정
        let titleText = "더블클릭하여 수정";
        if (isRmk && main) {
            // 비고 필드: 전체 텍스트를 툴팁으로 표시
            titleText = `${main}\n(더블클릭하여 수정)`;
        } else if (isCompanyName) {
            titleText = `${main}\n(더블클릭하여 수정)`;
        } else if (isSymbol && row.companyName) {
            titleText = `${row.companyName}\n(더블클릭하여 수정)`;
        }

        return (
            <Td className={tdClassName}>
                <div
                    className={`
                        ${isTwoLine
                            ? 'min-h-[40px] flex flex-col justify-center items-start'
                            : 'h-9 flex items-center'
                        }
                        cursor-pointer rounded px-2 py-1
                        bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700
                        border border-transparent hover:border-slate-200 dark:hover:border-slate-600
                        transition-all duration-100
                    `}
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEdit(row, field);
                    }}
                    title={titleText}
                >
                    <div className={`
                        ${isCompanyName || isRmk ? "truncate w-full" : ""}
                        ${isMoney ? "tabular-nums" : ""}
                        text-slate-700 dark:text-slate-200
                    `}>
                        {main}
                    </div>
                    {subTargetDiff}
                </div>
            </Td>
        );
    }

    return (
        <Td className={tdClassName}>
            <input
                autoFocus
                type={type}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') {
                        setDraft(row[field] ?? '');
                        setEditing(null);
                    }
                }}
                onBlur={commitEdit}
                className="w-full h-9 rounded-md border px-2 text-sm
                    bg-white border-blue-400 ring-2 ring-blue-100
                    dark:bg-slate-700 dark:border-blue-500 dark:ring-blue-900/50 dark:text-white
                    focus:outline-none transition-all"
            />
        </Td>
    );
}
