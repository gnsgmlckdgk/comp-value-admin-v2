import { useState, useEffect } from 'react';
import { send } from '@/util/ClientUtil';
import PageTitle from '@/component/common/display/PageTitle';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';

/**
 * 코인 자동매매 대상 종목 설정 페이지
 */
export default function CointradeCoins() {
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 종목 선택 모드: 'ALL' | 'SELECTED'
    const [targetMode, setTargetMode] = useState('ALL');

    // 업비트 전체 종목 목록
    const [allCoins, setAllCoins] = useState([]);

    // 선택된 종목 코드 Set
    const [selectedCoins, setSelectedCoins] = useState(new Set());

    // 필터
    const [searchText, setSearchText] = useState('');
    const [marketFilter, setMarketFilter] = useState('ALL'); // ALL, KRW, BTC, USDT

    // Toast auto-hide
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    // 페이지 로드 시
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. 업비트 전체 종목 조회
            const upbitResponse = await send('/dart/api/upbit/market/all', {}, 'GET');
            if (upbitResponse.data?.success && upbitResponse.data?.response) {
                setAllCoins(upbitResponse.data.response);
            }

            // 2. 현재 TARGET_MODE 조회
            const configResponse = await send('/dart/api/cointrade/config', {}, 'GET');
            if (configResponse.data?.success && configResponse.data?.response) {
                const configList = configResponse.data.response;
                const targetModeConfig = configList.find(c => c.paramName === 'TARGET_MODE');
                if (targetModeConfig) {
                    setTargetMode(targetModeConfig.paramValue);
                }
            }

            // 3. 현재 선택된 종목 조회
            const coinsResponse = await send('/dart/api/cointrade/coins', {}, 'GET');
            if (coinsResponse.data?.success && coinsResponse.data?.response) {
                const activeCoins = coinsResponse.data.response
                    .filter(coin => coin.isActive)
                    .map(coin => coin.coinCode);
                setSelectedCoins(new Set(activeCoins));
            }
        } catch (e) {
            console.error('초기 데이터 로딩 실패:', e);
            setToast('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaveLoading(true);
        try {
            // 1. TARGET_MODE 저장
            const configUpdateList = [{
                paramName: 'TARGET_MODE',
                paramValue: targetMode
            }];

            const configResult = await send('/dart/api/cointrade/config', configUpdateList, 'PUT');
            if (configResult.error) {
                setToast('TARGET_MODE 저장 실패: ' + configResult.error);
                return;
            }

            // 2. 직접 지정 모드인 경우 선택된 종목 저장
            if (targetMode === 'SELECTED') {
                const selectedCoinsList = Array.from(selectedCoins);
                const coinsResult = await send('/dart/api/cointrade/coins', selectedCoinsList, 'PUT');

                if (coinsResult.error) {
                    setToast('종목 저장 실패: ' + coinsResult.error);
                    return;
                }
            }

            setToast('설정이 저장되었습니다.');
        } catch (e) {
            console.error('저장 실패:', e);
            setToast('저장 중 오류가 발생했습니다.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleCoinToggle = (coinCode) => {
        const newSelected = new Set(selectedCoins);
        if (newSelected.has(coinCode)) {
            newSelected.delete(coinCode);
        } else {
            newSelected.add(coinCode);
        }
        setSelectedCoins(newSelected);
    };

    const handleSelectAll = () => {
        const filteredCoins = getFilteredCoins();
        const newSelected = new Set(selectedCoins);
        filteredCoins.forEach(coin => newSelected.add(coin.market));
        setSelectedCoins(newSelected);
    };

    const handleDeselectAll = () => {
        const filteredCoins = getFilteredCoins();
        const newSelected = new Set(selectedCoins);
        filteredCoins.forEach(coin => newSelected.delete(coin.market));
        setSelectedCoins(newSelected);
    };

    const getFilteredCoins = () => {
        return allCoins.filter(coin => {
            // 마켓 필터
            if (marketFilter !== 'ALL') {
                if (!coin.market.startsWith(marketFilter + '-')) {
                    return false;
                }
            }

            // 검색 필터
            if (searchText) {
                const search = searchText.toLowerCase();
                const marketLower = coin.market.toLowerCase();
                const koreanLower = (coin.korean_name || '').toLowerCase();
                const englishLower = (coin.english_name || '').toLowerCase();

                if (!marketLower.includes(search) &&
                    !koreanLower.includes(search) &&
                    !englishLower.includes(search)) {
                    return false;
                }
            }

            return true;
        });
    };

    const getMarketBadgeColor = (market) => {
        if (market.startsWith('KRW-')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        if (market.startsWith('BTC-')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        if (market.startsWith('USDT-')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };

    const filteredCoins = getFilteredCoins();
    const selectedCount = selectedCoins.size;
    const filteredSelectedCount = filteredCoins.filter(coin => selectedCoins.has(coin.market)).length;

    return (
        <div className="container mx-auto max-w-6xl p-4">
            <PageTitle>자동매매 대상 종목 설정</PageTitle>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-slate-600 dark:text-slate-400">로딩 중...</div>
                </div>
            ) : (
                <>
                    {/* 종목 선택 모드 */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                            종목 선택 모드
                        </h2>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="targetMode"
                                    value="ALL"
                                    checked={targetMode === 'ALL'}
                                    onChange={(e) => setTargetMode(e.target.value)}
                                    className="w-4 h-4"
                                />
                                <span className="text-slate-700 dark:text-slate-300">전체</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="targetMode"
                                    value="SELECTED"
                                    checked={targetMode === 'SELECTED'}
                                    onChange={(e) => setTargetMode(e.target.value)}
                                    className="w-4 h-4"
                                />
                                <span className="text-slate-700 dark:text-slate-300">직접 지정</span>
                            </label>
                        </div>
                    </div>

                    {/* 직접 지정 모드일 때만 종목 선택 UI 표시 */}
                    {targetMode === 'SELECTED' && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                                    종목 선택 ({filteredSelectedCount} / {filteredCoins.length})
                                </h2>
                                <div className="flex gap-2">
                                    <Button onClick={handleSelectAll} className="px-4 py-2 text-sm">
                                        전체 선택
                                    </Button>
                                    <Button onClick={handleDeselectAll} className="px-4 py-2 text-sm">
                                        전체 해제
                                    </Button>
                                </div>
                            </div>

                            {/* 필터 */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                {/* 마켓 필터 */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setMarketFilter('ALL')}
                                        className={`px-3 py-1 rounded text-sm ${
                                            marketFilter === 'ALL'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        전체
                                    </button>
                                    <button
                                        onClick={() => setMarketFilter('KRW')}
                                        className={`px-3 py-1 rounded text-sm ${
                                            marketFilter === 'KRW'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        KRW
                                    </button>
                                    <button
                                        onClick={() => setMarketFilter('BTC')}
                                        className={`px-3 py-1 rounded text-sm ${
                                            marketFilter === 'BTC'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        BTC
                                    </button>
                                    <button
                                        onClick={() => setMarketFilter('USDT')}
                                        className={`px-3 py-1 rounded text-sm ${
                                            marketFilter === 'USDT'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        USDT
                                    </button>
                                </div>

                                {/* 검색 필터 */}
                                <div className="flex-1">
                                    <Input
                                        type="text"
                                        placeholder="종목코드 또는 종목명 검색..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* 종목 목록 */}
                            <div className="max-h-[600px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                                    {filteredCoins.map((coin) => (
                                        <label
                                            key={coin.market}
                                            className="flex items-start gap-3 p-3 rounded hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border border-slate-200 dark:border-slate-600"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCoins.has(coin.market)}
                                                onChange={() => handleCoinToggle(coin.market)}
                                                className="mt-1 w-4 h-4 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${getMarketBadgeColor(coin.market)}`}>
                                                        {coin.market.split('-')[0]}
                                                    </span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                                                        {coin.market}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                                    {coin.korean_name}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-500 truncate">
                                                    {coin.english_name}
                                                </div>
                                                {coin.market_event?.warning && (
                                                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                        ⚠️ 유의종목
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {filteredCoins.length === 0 && (
                                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                        검색 결과가 없습니다.
                                    </div>
                                )}
                            </div>

                            {/* 선택된 종목 요약 */}
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded">
                                <div className="text-sm text-slate-700 dark:text-slate-300">
                                    <strong>전체 선택된 종목:</strong> {selectedCount}개
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 저장 버튼 */}
                    <div className="flex justify-end gap-3">
                        <Button
                            onClick={handleSave}
                            disabled={saveLoading}
                            className="px-6 py-2"
                        >
                            {saveLoading ? '저장 중...' : '저장'}
                        </Button>
                    </div>
                </>
            )}

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
