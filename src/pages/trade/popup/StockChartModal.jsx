import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchStockPriceVolume } from '@/util/ChartApi';

/**
 * 주식 가격 및 거래량 차트 모달
 */
const StockChartModal = ({ isOpen, onClose, symbol, companyName }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !symbol) return;

        loadChartData();
    }, [isOpen, symbol]);

    const loadChartData = async () => {
        setLoading(true);
        setError(null);

        // 최근 30일 데이터 조회
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        try {
            const result = await fetchStockPriceVolume(symbol, from, to);

            if (result.error) {
                setError(result.error);
                return;
            }

            if (result.data?.success && result.data?.response) {
                // 날짜 기준 오름차순 정렬
                const sortedData = [...result.data.response].sort((a, b) =>
                    new Date(a.date) - new Date(b.date)
                );
                setChartData(sortedData);
            } else {
                setError('차트 데이터를 불러올 수 없습니다.');
            }
        } catch (err) {
            setError('차트 데이터 조회 중 오류가 발생했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ESC 키로 닫기
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const latestData = chartData[chartData.length - 1];
    const previousData = chartData[chartData.length - 2];
    const change = latestData && previousData ? latestData.close - previousData.close : 0;
    const changePercent = latestData?.changePercent || 0;
    const isPositive = change >= 0;

    return (
        <>
            {/* 배경 오버레이 */}
            <div className="fixed inset-0 bg-black/50 z-[90]" onClick={onClose} />

            {/* 모달 */}
            <div
                className="fixed z-[95] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white shadow-xl rounded-lg max-h-[85vh] w-[min(1000px,90vw)] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b bg-white z-10">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-slate-800">
                                {companyName || symbol}
                            </h2>
                            <span className="text-sm text-slate-500">{symbol}</span>
                        </div>
                        {latestData && (
                            <div className="flex items-baseline gap-3 mt-1">
                                <span className="text-xl font-bold text-slate-900">
                                    ${latestData.close.toLocaleString('en-US', {
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
                    </div>
                    <button
                        className="text-sm px-3 py-2 border rounded hover:bg-gray-50 transition-colors"
                        onClick={onClose}
                    >
                        닫기 (Esc)
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className="p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-slate-500">차트 데이터를 불러오는 중...</div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-red-600 text-sm">{error}</div>
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-slate-500">차트 데이터가 없습니다.</div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* 가격 차트 */}
                            <div className="bg-white rounded-lg border p-4">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">주식 가격 (최근 30일)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickFormatter={(date) => {
                                                const d = new Date(date);
                                                return `${d.getMonth() + 1}/${d.getDate()}`;
                                            }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            domain={['dataMin - 5', 'dataMax + 5']}
                                            tickFormatter={(value) => `$${value.toFixed(0)}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                padding: '8px 12px',
                                            }}
                                            formatter={(value, name) => {
                                                if (name === 'close') return [`$${value.toFixed(2)}`, '종가'];
                                                if (name === 'high') return [`$${value.toFixed(2)}`, '고가'];
                                                if (name === 'low') return [`$${value.toFixed(2)}`, '저가'];
                                                if (name === 'open') return [`$${value.toFixed(2)}`, '시가'];
                                                return [value, name];
                                            }}
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
                                            dataKey="high"
                                            stroke="#94a3b8"
                                            strokeWidth={1}
                                            dot={false}
                                            strokeDasharray="3 3"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="low"
                                            stroke="#94a3b8"
                                            strokeWidth={1}
                                            dot={false}
                                            strokeDasharray="3 3"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="close"
                                            stroke="#3b82f6"
                                            strokeWidth={2.5}
                                            dot={false}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                <div className="flex justify-center gap-4 mt-3 text-xs text-slate-600">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-0.5 bg-blue-500"></div>
                                        <span>종가</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-0.5 bg-slate-400 border-dashed border-t"></div>
                                        <span>고가/저가</span>
                                    </div>
                                </div>
                            </div>

                            {/* 거래량 차트 */}
                            <div className="bg-white rounded-lg border p-4">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">거래량</h3>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickFormatter={(date) => {
                                                const d = new Date(date);
                                                return `${d.getMonth() + 1}/${d.getDate()}`;
                                            }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickFormatter={(value) => {
                                                if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                                                return value;
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                padding: '8px 12px',
                                            }}
                                            formatter={(value) => [value.toLocaleString(), '거래량']}
                                            labelFormatter={(date) =>
                                                new Date(date).toLocaleDateString('ko-KR', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })
                                            }
                                        />
                                        <Bar
                                            dataKey="volume"
                                            fill="#8b5cf6"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* 최근 데이터 요약 */}
                            {latestData && (
                                <div className="bg-slate-50 rounded-lg border p-4">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                                        최근 데이터 ({new Date(latestData.date).toLocaleDateString('ko-KR')})
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        <DataItem label="시가" value={`$${latestData.open.toFixed(2)}`} />
                                        <DataItem label="고가" value={`$${latestData.high.toFixed(2)}`} />
                                        <DataItem label="저가" value={`$${latestData.low.toFixed(2)}`} />
                                        <DataItem label="종가" value={`$${latestData.close.toFixed(2)}`} />
                                        <DataItem label="거래량" value={latestData.volume.toLocaleString()} />
                                        <DataItem label="VWAP" value={`$${latestData.vwap.toFixed(2)}`} />
                                        <DataItem
                                            label="변동"
                                            value={`${latestData.change >= 0 ? '+' : ''}${latestData.change.toFixed(2)}`}
                                            valueClassName={latestData.change >= 0 ? 'text-emerald-600' : 'text-red-600'}
                                        />
                                        <DataItem
                                            label="변동률"
                                            value={`${latestData.changePercent >= 0 ? '+' : ''}${latestData.changePercent.toFixed(2)}%`}
                                            valueClassName={latestData.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

/**
 * 데이터 아이템 컴포넌트
 */
const DataItem = ({ label, value, valueClassName = '' }) => (
    <div>
        <div className="text-slate-500 mb-1">{label}</div>
        <div className={`font-semibold ${valueClassName}`}>{value}</div>
    </div>
);

export default StockChartModal;
