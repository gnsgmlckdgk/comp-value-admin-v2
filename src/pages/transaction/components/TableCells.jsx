import { toNum, fmtUsd, fmtDate } from '../utils/formatters';

/**
 * 기본 테이블 셀 컴포넌트
 */
export function Td({ children, className = '' }) {
    return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}

/**
 * KRW 표시 셀
 */
export function KrwCell({ value }) {
    const v = toNum(value);
    return (
        <Td>
            <div className="px-1 h-9 flex items-center">
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
            <div className="px-1 h-9 flex items-center">
                {v ? `$ ${fmtUsd(v)}` : ''}
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
    const cls = pos ? 'text-rose-600' : 'text-blue-600';

    return (
        <Td>
            <div className="px-1 leading-tight text-center">
                <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtUsd(d)}</div>
                <div className="text-[11px] text-slate-500">{fx ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
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
    const cls = pos ? 'text-rose-600' : 'text-blue-600';

    return (
        <Td>
            <div className="px-1 leading-tight text-center">
                <div className={cls}>{(pos ? '+' : '') + '$ ' + fmtUsd(d)}</div>
                <div className="text-[11px] text-slate-500">{fx ? `₩ ${dKrw.toLocaleString()}` : ''}</div>
                <div className={cls + ' text-[12px]'}>{(pos ? '+' : '') + pct.toFixed(2)}%</div>
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
        const main = isMoney ? `$ ${fmtUsd(value)}` : isDate ? fmtDate(value) : (value ?? '');

        // 매도목표가 셀: 현재가와의 차이를 보조 줄에 표시
        let subTargetDiff = null;
        if (field === 'targetPrice') {
            const cur = toNum(row.currentPrice);
            const tgt = toNum(value);
            if (cur || tgt) {
                const d = cur - tgt; // 현재가 - 목표가
                const pos = d >= 0;
                const cls = pos ? 'text-rose-600' : 'text-blue-600';
                subTargetDiff = (
                    <div className={`${cls} text-[11px]`}>{`(${pos ? '+' : ''}$ ${fmtUsd(d)})`}</div>
                );
            }
        }

        const isTwoLine = field === 'targetPrice' && !!subTargetDiff;
        const isCompanyName = field === 'companyName';

        return (
            <Td className={tdClassName}>
                <div
                    className={
                        isTwoLine
                            ? 'min-h-[40px] flex flex-col justify-center items-start cursor-pointer bg-blue-50/30 hover:bg-blue-100/40 rounded px-1 border border-dashed border-blue-200/50'
                            : 'h-9 flex items-center cursor-pointer bg-blue-50/30 hover:bg-blue-100/40 rounded px-1 border border-dashed border-blue-200/50'
                    }
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEdit(row, field);
                    }}
                    title={isCompanyName ? `${main}\n(더블클릭하여 수정)` : "더블클릭하여 수정"}
                >
                    <div className={isCompanyName ? "truncate w-full" : ""}>{main}</div>
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
                className="w-full h-9 rounded border px-2 text-sm"
            />
        </Td>
    );
}
