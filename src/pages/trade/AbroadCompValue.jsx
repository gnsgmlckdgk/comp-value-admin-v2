import Loading from '@/component/common/display/Loading';
import { useCallback, useMemo, useRef, useState } from 'react';

import BulkQueryModal from '@/pages/trade/popup/BulkQueryModal';
import CompanyValueResultModal from '@/pages/trade/popup/CompanyValueResultModal';
import { send } from '@/util/ClientUtil';

// ----------------------------------------------
// 유틸리티: URL 빌더 (중복 제거)
// ----------------------------------------------
const buildUrl = (base, params) => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) usp.append(k, String(v));
    });
    return `${base}?${usp.toString()}`;
};

const INITIAL_COMP_LIST = [];

/**
 * 해외 기업 가치 계산
 */
const AbroadCompValue = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [compName, setCompName] = useState('');
    const [compNameData, setCompNameData] = useState(INITIAL_COMP_LIST);
    const [compValueData, setCompValueData] = useState({});
    const [showPopup, setShowPopup] = useState(false);
    const [showBulk, setShowBulk] = useState(false);

    const inFlight = useRef({ search: false, calc: false });
    const latestSearchReqId = useRef(0);

    const resultCount = useMemo(() => (Array.isArray(compNameData) ? compNameData.length : 0), [compNameData]);

    const tableHead = useMemo(() => (
        <thead className="sticky top-0 z-10 bg-indigo-600 text-white">
            <tr>
                {['symbol', 'name', 'currency', 'exchangeFullName', 'exchange'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>
                ))}
            </tr>
        </thead>
    ), []);

    const EmptyState = ({ message }) => (
        <tr>
            <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                {message}
            </td>
        </tr>
    );

    const compSymbolSearch = useCallback(async () => {
        if (!compName.trim()) {
            setCompNameData([]);
            return;
        }

        if (inFlight.current.search) return;
        inFlight.current.search = true;

        setIsLoading(true);

        const reqId = ++latestSearchReqId.current;

        try {
            const q = compName.trim();
            const sendUrl = buildUrl('/dart/abroad/company/search/symbol', { cn: q, symbol: q });
            const { data, error } = await send(sendUrl, {}, 'GET');

            if (reqId !== latestSearchReqId.current) return;

            if (!error && data && data.response) {
                const list = Array.isArray(data.response) ? data.response : [];
                setCompNameData(list);
            } else {
                setCompNameData([]);
            }
        } catch (e) {
            if (reqId !== latestSearchReqId.current) return;
            setCompNameData([]);
        } finally {
            if (reqId === latestSearchReqId.current) setIsLoading(false);
            inFlight.current.search = false;
        }
    }, [compName]);

    const compValueCal = useCallback(
        async (row) => {
            if (!Array.isArray(compNameData) || compNameData.length === 0) {
                alert('기업 정보가 존재하지 않습니다.');
                return;
            }

            const symbol = row && row.symbol ? row.symbol.trim() : '';
            if (!symbol) {
                alert('심볼 정보가 존재하지 않습니다.');
                return;
            }

            if (inFlight.current.calc) return;
            inFlight.current.calc = true;

            setIsLoading(true);
            try {
                const sendUrl = buildUrl('/dart/main/cal/per_value/abroad/v2', { symbol });
                const { data, error } = await send(sendUrl, {}, 'GET');

                const hasValid = !error && data && data.response && Object.keys(data.response).length > 0;
                if (hasValid) {
                    setCompValueData(data.response);
                    setShowPopup(true);
                } else {
                    setCompValueData({});
                    alert('조회 결과가 존재하지 않거나 서버 응답을 받지 못했습니다.');
                }
            } catch (e) {
                setCompValueData({});
                alert('요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            } finally {
                setIsLoading(false);
                inFlight.current.calc = false;
            }
        },
        [compNameData]
    );

    const onKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                compSymbolSearch();
            }
        },
        [compSymbolSearch]
    );

    return (
        <div>
            <Loading show={isLoading} />

            <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">기업분석(해외)</h1>
                <p className="mt-1 text-sm text-slate-500">심볼을 검색하고 행을 클릭하면 기업가치 계산 결과를 팝업으로 확인할 수 있어요.</p>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={compName}
                            onChange={(e) => setCompName(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="심볼 및 회사명으로 검색 (Enter)"
                            className="w-[min(520px,90vw)] px-3 py-2 rounded-md border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            aria-label="심볼/회사명 검색"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={compSymbolSearch}
                            disabled={isLoading || !compName.trim()}
                            className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                            검색
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowBulk(true)}
                            disabled={isLoading}
                            className="px-3 py-2 rounded-md border text-sm font-medium hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            대량 조회
                        </button>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 sm:ml-1">{resultCount}건</div>
                </div>

                <div className="rounded-lg shadow-sm ring-1 ring-slate-200 overflow-hidden">
                    <div className="overflow-auto max-h-[60vh]">
                        <table className="min-w-full text-sm">
                            {tableHead}
                            <tbody className="divide-y divide-slate-200">
                                {Array.isArray(compNameData) && compNameData.length > 0 ? (
                                    compNameData.map((row, idx) => (
                                        <tr
                                            key={`${row.symbol || 'row'}-${idx}`}
                                            className="even:bg-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => !isLoading && compValueCal(row)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    !isLoading && compValueCal(row);
                                                }
                                            }}
                                            aria-label={`계산 ${row.symbol}`}
                                        >
                                            <td className="px-4 py-2 whitespace-nowrap font-medium">{row.symbol}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.name}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.currency}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.exchangeFullName}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{row.exchange}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <EmptyState message="검색 결과가 없습니다. 상단 입력창에 키워드를 입력하고 Enter 를 눌러보세요." />
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <CompanyValueResultModal
                isOpen={showPopup}
                onClose={() => {
                    setShowPopup(false);
                }}
                data={compValueData}
            />

            <BulkQueryModal open={showBulk} onClose={() => setShowBulk(false)} />
        </div>
    );
};

export default AbroadCompValue;