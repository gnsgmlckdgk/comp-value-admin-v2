import { useState, useCallback } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';

const fmtPct = (v) => {
    if (v == null) return '-';
    const n = Number(v);
    const cls = n > 0 ? 'text-blue-600 dark:text-blue-400' : n < 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500';
    return <span className={`font-semibold ${cls}`}>{n > 0 ? '+' : ''}{n.toFixed(2)}%</span>;
};

// 기본 기준일: 7일 전
const defaultFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
};

const SummaryTable = ({ title, data }) => (
    <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                        {['그룹', '종목수', '평균수익률', '승률', '최고', '최저'].map((h) => (
                            <th key={h} className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right first:text-left whitespace-nowrap">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {(!data || data.length === 0) && (
                        <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">데이터 없음</td></tr>
                    )}
                    {data && data.map((s) => (
                        <tr key={s.group} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-4 py-2.5 text-left font-medium text-slate-800 dark:text-slate-100">{s.group}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{s.count}</td>
                            <td className="px-4 py-2.5 text-right">{fmtPct(s.avgReturnPct)}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">{s.winRatePct != null ? `${s.winRatePct.toFixed(0)}%` : '-'}</td>
                            <td className="px-4 py-2.5 text-right">{fmtPct(s.maxReturnPct)}</td>
                            <td className="px-4 py-2.5 text-right">{fmtPct(s.minReturnPct)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

/**
 * 성과 추적 (2-4)
 * 기준일의 투자판정/가치등급별 이후 실제 수익률 집계 — "매수후보가 관망보다 실제 수익 높은가"
 */
const EvaluationPerformance = () => {
    const [fromDate, setFromDate] = useState(defaultFrom());
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        const { data, error } = await send(`/dart/main/evaluation/performance?from=${fromDate}`, null, 'GET');
        if (error) { setError(error); setResult(null); }
        else setResult(data?.response || null);
        setLoading(false);
    }, [fromDate]);

    return (
        <div className="p-4 md:p-6">
            <PageTitle />

            <div className="flex flex-wrap items-end gap-3 mb-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">기준일 (이 날짜의 판정이 이후 낸 수익률)</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                    />
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? '조회 중…' : '조회'}
                </button>
            </div>

            {error && (
                <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-4 py-3 text-sm">{error}</div>
            )}

            {result && (
                <>
                    <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                        기준일 {result.baseDate || '-'} → 최신일 {result.latestDate || '-'}
                        {result.note && <span className="ml-2 text-amber-600 dark:text-amber-400">· {result.note}</span>}
                    </div>
                    <SummaryTable title="투자판정별 성과" data={result.bySignal} />
                    <SummaryTable title="가치등급별 성과" data={result.byGrade} />
                </>
            )}

            {!result && !loading && (
                <div className="text-sm text-slate-400">기준일을 선택하고 조회하세요. 수익률은 며칠 이상 데이터가 쌓여야 유의미합니다.</div>
            )}
        </div>
    );
};

export default EvaluationPerformance;
