import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMultipleIndices } from '@/util/ChartApi';

// 미국 3대 지수 정보
const US_INDICES = [
    { symbol: '^GSPC', name: 'S&P 500', color: '#3b82f6' }, // blue
    { symbol: '^DJI', name: 'Dow Jones', color: '#8b5cf6' }, // purple
    { symbol: '^IXIC', name: 'NASDAQ', color: '#10b981' }, // green
];

export default function MarketIndexCharts() {
    const [chartsData, setChartsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadChartData();
    }, []);

    const loadChartData = async () => {
        setLoading(true);
        setError(null);

        // 최근 30일 데이터 조회
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const queries = US_INDICES.map(index => ({
            symbol: index.symbol,
            from,
            to,
        }));

        try {
            const results = await fetchMultipleIndices(queries);
            const dataMap = {};

            results.forEach(({ symbol, data, error }) => {
                if (error) {
                    console.error(`Failed to load ${symbol}:`, error);
                    return;
                }

                if (data?.success && data?.response) {
                    // 날짜 기준 오름차순 정렬
                    const sortedData = [...data.response].sort((a, b) =>
                        new Date(a.date) - new Date(b.date)
                    );
                    dataMap[symbol] = sortedData;
                }
            });

            setChartsData(dataMap);
        } catch (err) {
            setError('차트 데이터를 불러오는데 실패했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full">
                <h2 className="text-xl font-bold mb-4 text-slate-800">미국 주요 지수</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {US_INDICES.map(index => (
                        <div key={index.symbol} className="bg-white rounded-lg border p-4 shadow-sm">
                            <div className="animate-pulse">
                                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
                                <div className="h-48 bg-slate-100 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full">
                <h2 className="text-xl font-bold mb-4 text-slate-800">미국 주요 지수</h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <h2 className="text-xl font-bold mb-4 text-slate-800">미국 주요 지수</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {US_INDICES.map(index => {
                    const data = chartsData[index.symbol] || [];
                    const latestData = data[data.length - 1];
                    const previousData = data[data.length - 2];

                    const change = latestData && previousData
                        ? latestData.close - previousData.close
                        : 0;
                    const changePercent = latestData?.changePercent || 0;
                    const isPositive = change >= 0;

                    return (
                        <IndexCard
                            key={index.symbol}
                            index={index}
                            data={data}
                            latestData={latestData}
                            change={change}
                            changePercent={changePercent}
                            isPositive={isPositive}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function IndexCard({ index, data, latestData, change, changePercent, isPositive }) {
    return (
        <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">{index.name}</h3>
                    <span className="text-xs text-slate-500">{index.symbol}</span>
                </div>
                {latestData && (
                    <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-slate-900">
                            {latestData.close.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </span>
                        <div className={`flex items-center gap-1 text-sm font-medium ${
                            isPositive ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                            <span>{isPositive ? '▲' : '▼'}</span>
                            <span>{Math.abs(change).toFixed(2)}</span>
                            <span>({(changePercent * 100).toFixed(2)}%)</span>
                        </div>
                    </div>
                )}
                {latestData && (
                    <div className="text-xs text-slate-500 mt-1">
                        {new Date(latestData.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </div>
                )}
            </div>

            <div className="p-4">
                <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickFormatter={(date) => {
                                const d = new Date(date);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            domain={['dataMin - 50', 'dataMax + 50']}
                            tickFormatter={(value) => value.toFixed(0)}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px',
                                padding: '8px 12px',
                            }}
                            formatter={(value) => [
                                value.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }),
                                'Close'
                            ]}
                            labelFormatter={(date) =>
                                new Date(date).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })
                            }
                        />
                        <Line
                            type="monotone"
                            dataKey="close"
                            stroke={index.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
