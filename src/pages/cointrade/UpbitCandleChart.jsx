import { useState, useEffect, useMemo, useRef } from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { send } from '@/util/ClientUtil';

const INTERVALS = [
    { value: 'days', label: '일(Day)' },
    { value: 'weeks', label: '주(Week)' },
    { value: 'months', label: '월(Month)' },
    { value: 'years', label: '연(Year)' },
];

const VIEW_RANGES = [
    { value: 50, label: '50개' },
    { value: 100, label: '100개' },
    { value: 200, label: '200개' },
    { value: 400, label: '400개' }, // Requires multiple fetches
    { value: 1000, label: '1000개' }, // Requires multiple fetches
];

export default function UpbitCandleChart({ market }) {
    const [interval, setInterval] = useState('days');
    const [viewCount, setViewCount] = useState(200);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [yAxisWidth, setYAxisWidth] = useState(60);

    useEffect(() => {
        const updateWidth = () => {
            setYAxisWidth(window.innerWidth < 768 ? 40 : 45); // md breakpoint
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // Fetch data when market, interval, or viewCount changes
    useEffect(() => {
        if (!market) return;
        fetchData();
    }, [market, interval, viewCount]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Calculate how many requests we need (max 200 per request)
            const maxPerRequest = 200;
            const requiredRequests = Math.ceil(viewCount / maxPerRequest);

            let allCandles = [];
            let lastTo = ''; // 'to' parameter for pagination (date string)

            for (let i = 0; i < requiredRequests; i++) {
                // Determine count for this request
                // If it's the last request, we might need less than 200
                // But generally asking for 200 is fine, we just slice later.
                // Actually, strictly asking for the remainder is better logic:
                const remaining = viewCount - allCandles.length;
                const countToFetch = Math.min(remaining, maxPerRequest);

                if (countToFetch <= 0) break;

                const params = {
                    market,
                    count: countToFetch,
                    converting_price_unit: 'KRW'
                };

                if (lastTo) {
                    params.to = lastTo;
                }

                // API Endpoint construction
                const endpoint = `/dart/api/upbit/candles/${interval}`;
                const queryStr = new URLSearchParams(params).toString();

                const response = await send(`${endpoint}?${queryStr}`, {}, 'GET');

                let fetchedData = [];
                if (response.data && Array.isArray(response.data)) {
                    // Case 1: Direct array (e.g. from some proxies or if send() returns raw axios data)
                    fetchedData = response.data;
                } else if (response.data && response.data.response && Array.isArray(response.data.response)) {
                    // Case 2: Standard wrapper (success: true, response: [...])
                    fetchedData = response.data.response;
                } else {
                    console.error('Unexpected response format:', response);
                    break;
                }

                if (fetchedData.length === 0) break; // No more data

                allCandles = [...allCandles, ...fetchedData];

                // Update 'to' for next request
                // The API returns data in reverse chronological order (newest first).
                // The last item is the oldest in this batch.
                // 'to' parameter expects format like "2023-01-01T00:00:00"
                // We use the 'candle_date_time_utc' of the last fetched item.
                const lastItem = fetchedData[fetchedData.length - 1];
                lastTo = lastItem.candle_date_time_utc;
            }

            // Sort by date ascending for the chart (Oldest -> Newest)
            // API returns Newest -> Oldest
            const sortedData = allCandles.reverse().map(item => ({
                ...item,
                // Ensure numeric types
                opening_price: Number(item.opening_price),
                high_price: Number(item.high_price),
                low_price: Number(item.low_price),
                trade_price: Number(item.trade_price),
                candle_acc_trade_volume: Number(item.candle_acc_trade_volume),
                // Format date for display
                displayDate: formatDisplayDate(item.candle_date_time_kst, interval)
            }));

            setData(sortedData);

        } catch (e) {
            console.error('Failed to fetch candles:', e);
            setError('차트 데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const formatDisplayDate = (dateStr, interval) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (interval === 'days') return `${date.getMonth() + 1}/${date.getDate()}`;
        if (interval === 'weeks') return `${date.getMonth() + 1}/${date.getDate()}`;
        if (interval === 'months') return `${date.getFullYear()}.${date.getMonth() + 1}`;
        if (interval === 'years') return `${date.getFullYear()}`;
        return dateStr;
    };

    // Prepare tooltip formatter
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const priceData = payload.find(p => p.dataKey === 'trade_price');
            const volData = payload.find(p => p.dataKey === 'candle_acc_trade_volume');

            if (!priceData) return null;
            const data = priceData.payload;

            const isUp = data.trade_price >= data.opening_price;
            const colorClass = isUp ? 'text-red-500' : 'text-blue-500';

            return (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded shadow-lg text-xs">
                    <p className="font-bold mb-1 dark:text-slate-200">{data.candle_date_time_kst.replace('T', ' ')}</p>
                    <div className="space-y-1">
                        <p className="flex justify-between gap-4">
                            <span className="text-slate-500">시가:</span>
                            <span className={colorClass}>{data.opening_price.toLocaleString()}</span>
                        </p>
                        <p className="flex justify-between gap-4">
                            <span className="text-slate-500">고가:</span>
                            <span className="text-red-500">{data.high_price.toLocaleString()}</span>
                        </p>
                        <p className="flex justify-between gap-4">
                            <span className="text-slate-500">저가:</span>
                            <span className="text-blue-500">{data.low_price.toLocaleString()}</span>
                        </p>
                        <p className="flex justify-between gap-4">
                            <span className="text-slate-500">종가:</span>
                            <span className={`font-bold ${colorClass}`}>{data.trade_price.toLocaleString()}</span>
                        </p>
                        <p className="flex justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-700 mt-1">
                            <span className="text-slate-500">거래량:</span>
                            <span className="dark:text-slate-300">{data.candle_acc_trade_volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Min/Max for Y-Axis scaling
    const yDomain = useMemo(() => {
        if (data.length === 0) return ['auto', 'auto'];
        const min = Math.min(...data.map(d => d.low_price));
        const max = Math.max(...data.map(d => d.high_price));
        const padding = (max - min) * 0.1; // 10% padding
        return [Math.floor(min - padding), Math.ceil(max + padding)];
    }, [data]);

    return (
        <div className="w-full h-full flex flex-col">
            {/* Toolbar */}
            <div className={`flex flex-wrap items-center justify-between gap-2 mb-4 pr-[${yAxisWidth}px]`}>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    {INTERVALS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setInterval(opt.value)}
                            disabled={loading}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${interval === opt.value
                                ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={viewCount}
                        onChange={(e) => setViewCount(Number(e.target.value))}
                        disabled={loading}
                        className="text-xs border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        {VIEW_RANGES.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchData}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                        title="새로고침"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-0 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 flex items-center justify-center z-10 backdrop-blur-sm">
                        <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">데이터 불러오는 중...</div>
                    </div>
                )}

                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm">
                        {error}
                    </div>
                ) : data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                        데이터가 없습니다.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                minTickGap={30}
                                padding={{ left: 0, right: 0 }}
                            />
                            {/* Y-Axis for Price (Right) */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={yDomain}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickFormatter={(val) => val.toLocaleString()}
                                width={yAxisWidth}
                            />
                            {/* Y-Axis for Volume (Left, Hidden or minimized) */}
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                tick={false}
                                width={0}
                                domain={[0, 'dataMax * 4']} // Make volume bars take up lower 1/4
                            />

                            <Tooltip content={<CustomTooltip />} />

                            {/* Volume Bars */}
                            <Bar
                                dataKey="candle_acc_trade_volume"
                                yAxisId="left"
                                fill="#cbd5e1"
                                opacity={0.5}
                                barSize={data.length > 100 ? 2 : 5}
                            />

                            {/* Price Line (Close) */}
                            <Line
                                type="monotone"
                                dataKey="trade_price"
                                yAxisId="right"
                                stroke="#3b82f6"
                                strokeWidth={1.5}
                                dot={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
