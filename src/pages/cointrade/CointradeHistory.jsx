import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';

/**
 * 코인 자동매매 거래기록 조회 페이지 (v2.1)
 */
export default function CointradeHistory() {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 필터
    const [filters, setFilters] = useState({
        startDate: '',
        startTime: '00:00',
        endDate: '',
        endTime: '23:59',
        coinCode: 'all',
        tradeType: 'all',    // all, BUY, SELL
        reason: 'all'        // all, SIGNAL, TAKE_PROFIT, STOP_LOSS, EXPIRED
    });

    // 거래기록 목록
    const [records, setRecords] = useState([]);

    // 종목 목록
    const [coinList, setCoinList] = useState([]);

    // 페이지네이션
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // 요약 정보
    const [summary, setSummary] = useState({
        buyCount: 0,
        buyAmount: 0,
        sellCount: 0,
        sellAmount: 0,
        totalProfit: 0,
        takeProfitCount: 0,
        stopLossCount: 0,
        expiredCount: 0
    });

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 페이지 로드 시 기본 기간 설정 (최근 30일)
    useEffect(() => {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        setFilters(prev => ({
            ...prev,
            startDate: thirtyDaysAgo.toISOString().split('T')[0],
            startTime: '00:00',
            endDate: today.toISOString().split('T')[0],
            endTime: '23:59'
        }));

        fetchCoinList();
    }, []);

    // 종목 목록 조회
    const fetchCoinList = async () => {
        try {
            const { data, error } = await send('/dart/api/cointrade/coins', {}, 'GET');
            if (!error && data?.success && data?.response) {
                // 활성화된 종목만
                const activeCoins = data.response.filter(coin => coin.isActive);
                setCoinList(activeCoins);
            }
        } catch (e) {
            console.error('종목 목록 조회 실패:', e);
        }
    };

    // 거래기록 조회
    const handleSearch = async () => {
        if (!filters.startDate || !filters.endDate) {
            setToast('조회 기간을 선택해주세요.');
            return;
        }

        setLoading(true);
        try {
            // 날짜와 시간 조립 (ISO 8601 형식)
            const startDateTime = `${filters.startDate}T${filters.startTime}:00`;
            const endDateTime = `${filters.endDate}T${filters.endTime}:59`;

            // 쿼리 파라미터 생성
            const params = new URLSearchParams({
                startDate: startDateTime,
                endDate: endDateTime
            });

            if (filters.coinCode !== 'all') {
                params.append('coinCode', filters.coinCode);
            }
            if (filters.tradeType !== 'all') {
                params.append('tradeType', filters.tradeType);
            }
            if (filters.reason !== 'all') {
                params.append('reason', filters.reason);
            }

            const { data, error } = await send(`/dart/api/cointrade/history?${params.toString()}`, {}, 'GET');

            if (error) {
                setToast('조회 실패: ' + error);
                setRecords([]);
            } else if (data?.success && data?.response) {
                if (data.response.content.length === 0) {
                    setToast('조회된 거래기록이 없습니다.');
                } else {
                    setRecords(data.response);
                    calculateSummary(data.response);
                    setCurrentPage(1); // 검색 시 첫 페이지로
                }
            }
        } catch (e) {
            console.error('거래기록 조회 실패:', e);
            setToast('조회 중 오류가 발생했습니다.');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    // 요약 정보 계산
    const calculateSummary = (data) => {
        const buyRecords = data.filter(r => r.tradeType === 'BUY');
        const sellRecords = data.filter(r => r.tradeType === 'SELL');

        const buyAmount = buyRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const sellAmount = sellRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const totalProfit = sellRecords.reduce((sum, r) => sum + (r.profitLoss || 0), 0);

        const takeProfitCount = sellRecords.filter(r => r.reason === 'TAKE_PROFIT').length;
        const stopLossCount = sellRecords.filter(r => r.reason === 'STOP_LOSS').length;
        const expiredCount = sellRecords.filter(r => r.reason === 'EXPIRED').length;

        setSummary({
            buyCount: buyRecords.length,
            buyAmount,
            sellCount: sellRecords.length,
            sellAmount,
            totalProfit,
            takeProfitCount,
            stopLossCount,
            expiredCount
        });
    };

    // 필터 변경
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // 페이지네이션
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRecords = records.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(records.length / itemsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // 사유 색상
    const getReasonColor = (reason) => {
        const colors = {
            'SIGNAL': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
            'TAKE_PROFIT': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
            'STOP_LOSS': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
            'EXPIRED': 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
        };
        return colors[reason] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
    };

    // 사유 라벨
    const getReasonLabel = (reason) => {
        const labels = {
            'SIGNAL': '매수',
            'TAKE_PROFIT': '익절',
            'STOP_LOSS': '손절',
            'EXPIRED': '만료'
        };
        return labels[reason] || reason;
    };

    return (
        <div className="container mx-auto max-w-7xl p-4">
            <PageTitle>거래기록 조회</PageTitle>

            {/* 필터 영역 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                    검색 조건
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {/* 시작일 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            시작일
                        </label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* 시작 시간 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            시작 시간
                        </label>
                        <Input
                            type="time"
                            value={filters.startTime}
                            onChange={(e) => handleFilterChange('startTime', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* 종료일 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            종료일
                        </label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* 종료 시간 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            종료 시간
                        </label>
                        <Input
                            type="time"
                            value={filters.endTime}
                            onChange={(e) => handleFilterChange('endTime', e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* 종목 선택 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            종목
                        </label>
                        <select
                            value={filters.coinCode}
                            onChange={(e) => handleFilterChange('coinCode', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">전체</option>
                            {coinList.map(coin => (
                                <option key={coin.coinCode} value={coin.coinCode}>
                                    {coin.coinCode} {coin.coinName && `(${coin.coinName})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 거래 유형 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            거래 유형
                        </label>
                        <select
                            value={filters.tradeType}
                            onChange={(e) => handleFilterChange('tradeType', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">전체</option>
                            <option value="BUY">매수</option>
                            <option value="SELL">매도</option>
                        </select>
                    </div>

                    {/* 매도 사유 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            매도 사유
                        </label>
                        <select
                            value={filters.reason}
                            onChange={(e) => handleFilterChange('reason', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">전체</option>
                            <option value="SIGNAL">매수 (SIGNAL)</option>
                            <option value="TAKE_PROFIT">익절 (TAKE_PROFIT)</option>
                            <option value="STOP_LOSS">손절 (STOP_LOSS)</option>
                            <option value="EXPIRED">만료 (EXPIRED)</option>
                        </select>
                    </div>
                </div>

                {/* 검색 버튼 */}
                <div className="flex justify-end mt-4">
                    <Button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-8 py-2"
                    >
                        {loading ? '조회 중...' : '검색'}
                    </Button>
                </div>
            </div>

            {/* 요약 정보 */}
            {records.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                        조회 결과 요약
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {/* 매수 건수 */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">매수 건수</div>
                            <div className="text-xl font-bold text-blue-800 dark:text-blue-300">
                                {summary.buyCount}건
                            </div>
                        </div>

                        {/* 매수 금액 */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">매수 금액</div>
                            <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                {(summary.buyAmount / 10000).toFixed(0)}만원
                            </div>
                        </div>

                        {/* 매도 건수 */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매도 건수</div>
                            <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                {summary.sellCount}건
                            </div>
                        </div>

                        {/* 매도 금액 */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">매도 금액</div>
                            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                {(summary.sellAmount / 10000).toFixed(0)}만원
                            </div>
                        </div>

                        {/* 실현 손익 */}
                        <div className={`p-4 rounded-lg ${summary.totalProfit >= 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'}`}>
                            <div className={`text-xs mb-1 ${summary.totalProfit >= 0 ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>실현 손익</div>
                            <div className={`text-lg font-bold ${summary.totalProfit >= 0 ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'}`}>
                                {summary.totalProfit >= 0 ? '+' : ''}{(summary.totalProfit / 10000).toFixed(1)}만원
                            </div>
                        </div>

                        {/* 익절 */}
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                            <div className="text-xs text-green-700 dark:text-green-400 mb-1">익절</div>
                            <div className="text-xl font-bold text-green-800 dark:text-green-300">
                                {summary.takeProfitCount}건
                            </div>
                        </div>

                        {/* 손절 */}
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                            <div className="text-xs text-red-700 dark:text-red-400 mb-1">손절</div>
                            <div className="text-xl font-bold text-red-800 dark:text-red-300">
                                {summary.stopLossCount}건
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                        만료 매도: <span className="font-medium text-slate-700 dark:text-slate-300">{summary.expiredCount}건</span>
                    </div>
                </div>
            )}

            {/* 거래기록 테이블 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    일시
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    종목
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    유형
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    가격
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    수량
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    금액
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    사유
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    손익
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    손익률
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    매수점수
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    급등확률
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        조회 중...
                                    </td>
                                </tr>
                            ) : currentRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        조회된 거래기록이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                currentRecords.map((record, index) => (
                                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        {/* 일시 */}
                                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                            {new Date(record.createdAt).toLocaleString('ko-KR', {
                                                year: '2-digit',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>

                                        {/* 종목 */}
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {record.coinCode}
                                        </td>

                                        {/* 유형 */}
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.tradeType === 'BUY'
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                                }`}>
                                                {record.tradeType === 'BUY' ? '매수' : '매도'}
                                            </span>
                                        </td>

                                        {/* 가격 */}
                                        <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                                            {record.price.toLocaleString()}원
                                        </td>

                                        {/* 수량 */}
                                        <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                                            {record.quantity.toFixed(8)}
                                        </td>

                                        {/* 금액 */}
                                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 dark:text-slate-100">
                                            {record.totalAmount.toLocaleString()}원
                                        </td>

                                        {/* 사유 */}
                                        <td className="px-4 py-3 text-center">
                                            {record.reason ? (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(record.reason)}`}>
                                                    {getReasonLabel(record.reason)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500">-</span>
                                            )}
                                        </td>

                                        {/* 손익 */}
                                        <td className="px-4 py-3 text-sm text-right">
                                            {record.profitLoss != null ? (
                                                <span className={record.profitLoss >= 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
                                                    {record.profitLoss >= 0 ? '+' : ''}{record.profitLoss.toLocaleString()}원
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500">-</span>
                                            )}
                                        </td>

                                        {/* 손익률 */}
                                        <td className="px-4 py-3 text-sm text-right">
                                            {record.profitLossRate != null ? (
                                                <span className={record.profitLossRate >= 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
                                                    {record.profitLossRate >= 0 ? '+' : ''}{record.profitLossRate.toFixed(2)}%
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500">-</span>
                                            )}
                                        </td>

                                        {/* 매수점수 (v2.1) */}
                                        <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                                            {record.buyScore != null ? `${record.buyScore.toFixed(2)}점` : '-'}
                                        </td>

                                        {/* 급등확률 (v2.1) */}
                                        <td className="px-4 py-3 text-sm text-right text-purple-600 dark:text-purple-400 font-medium">
                                            {record.surgeProbability != null ? `${(record.surgeProbability * 100).toFixed(0)}%` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                            이전
                        </button>

                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            // 첫 페이지, 마지막 페이지, 현재 페이지 주변만 표시
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 2 && page <= currentPage + 2)
                            ) {
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-1 rounded-md ${currentPage === page
                                            ? 'bg-blue-500 text-white font-medium'
                                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (page === currentPage - 3 || page === currentPage + 3) {
                                return <span key={page} className="text-slate-400">...</span>;
                            }
                            return null;
                        })}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>

            {/* Toast 메시지 */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
                    <div className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
                        <p className="text-sm whitespace-pre-line">{toast}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
