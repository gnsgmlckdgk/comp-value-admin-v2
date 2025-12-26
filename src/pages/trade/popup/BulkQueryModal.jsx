import { useState, useMemo, useEffect } from 'react';
import ExcelJS from 'exceljs';

import { send } from '@/util/ClientUtil';

// 분할 조회 설정 (FMP API 분당 300건 제한 대응)
// 30건씩 조회 후 10초 대기 → 분당 약 180건 속도로 안전하게 처리
const BATCH_SIZE = 30; // 한 번에 처리할 심볼 수
const BATCH_DELAY_MS = 10000; // 배치 사이 대기 시간 (10초)

/**
 * 대량조회 모달
 * props:
 *  - open: boolean
 *  - onClose: () => void
 *  - fetcher?: (symbols: string[]) => Promise<Array<any>>
 *      // 백단 연동 함수(주입 가능). 미주입 시 defaultBulkFetcher 사용
 *  - openAlert?: (msg: string) => void
 *  - initialSymbols?: string[] // 외부에서 주입할 심볼 배열
 */
export default function BulkQueryModal({ open, onClose, fetcher, initialSymbols = [] }) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentSymbol: '' });
    const [internalAlert, setInternalAlert] = useState({ open: false, message: '' });

    // 내부 알림 함수 (z-index 문제 해결)
    const showAlert = (message) => {
        setInternalAlert({ open: true, message });
    };

    const closeAlert = () => {
        setInternalAlert({ open: false, message: '' });
    };

    // 모달 열릴 때 initialSymbols 세팅
    useEffect(() => {
        if (open && initialSymbols.length > 0) {
            setInput(initialSymbols.join('\n'));
        }
    }, [open, initialSymbols]);

    // 모달 닫힐 때 상태 초기화
    useEffect(() => {
        if (!open) {
            setProgress({ current: 0, total: 0, currentSymbol: '' });
        }
    }, [open]);

    const symbols = useMemo(
        () =>
            input
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean),
        [input]
    );

    if (!open) return null;

    const run = async () => {
        if (symbols.length === 0) {
            showAlert('심볼을 한 줄에 하나씩 입력해주세요.');
            return;
        }
        setLoading(true);
        setProgress({ current: 0, total: symbols.length, currentSymbol: '' });

        try {
            const fn = fetcher || defaultBulkFetcher;
            const items = await fn(symbols, (current, total, currentSymbol) => {
                setProgress({ current, total, currentSymbol });
            });
            await exportToExcel(Array.isArray(items) ? items : []);
            showAlert(`${items.length}건의 데이터가 엑셀로 저장되었습니다.`);
        } catch (e) {
            console.error(e);
            showAlert('조회/엑셀 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
            setProgress({ current: 0, total: 0, currentSymbol: '' });
        }
    };

    return (
        <>
            {/* backdrop */}
            <div className="fixed inset-0 z-[70] bg-black/50 dark:bg-black/70" onClick={onClose} />

            {/* modal */}
            <div
                className="fixed z-[80] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(840px,calc(100vw-24px))] max-h-[85vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-2xl dark:bg-slate-800 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-2.5 dark:bg-slate-800 dark:border-slate-700">
                    <div className="text-sm font-semibold text-slate-800 dark:text-white">대량 조회</div>
                    <button className="text-xs rounded border px-2 py-1 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" onClick={onClose}>
                        닫기 (Esc)
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-[12px] text-slate-600 dark:text-slate-400">
                        심볼을 <span className="font-medium">한 줄에 하나씩</span> 입력하고 "엑셀로 내보내기"를 누르면,
                        서버 조회 후 결과를 엑셀 파일로 저장합니다.
                        {symbols.length > BATCH_SIZE && (
                            <span className="block mt-1 text-amber-600 dark:text-amber-400">
                                ⚠️ {symbols.length}개 심볼은 {BATCH_SIZE}건씩 나누어 {Math.ceil(symbols.length / BATCH_SIZE)}회 조회됩니다. (배치 간 10초 대기)
                            </span>
                        )}
                    </p>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={'예)\nAAPL\nMSFT\nGOOGL\nNVDA'}
                        className="w-full h-[220px] rounded-md border border-slate-300 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                        disabled={loading}
                    />

                    {/* 프로그레스 바 */}
                    {loading && progress.total > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                <span>
                                    진행 중: <span className="font-medium text-slate-800 dark:text-white">{progress.currentSymbol}</span>
                                </span>
                                <span>
                                    {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-600">
                                <div
                                    className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] text-slate-500 dark:text-slate-400">{symbols.length}개 심볼</div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="px-3 py-2 rounded-md border text-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setInput('')}
                                disabled={loading}
                            >
                                초기화
                            </button>
                            <button
                                type="button"
                                className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-60 flex items-center gap-2"
                                onClick={run}
                                disabled={loading}
                            >
                                {loading && (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {loading ? '처리 중…' : '엑셀로 내보내기'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 내부 알림 모달 (z-index 문제 해결) */}
            {internalAlert.open && (
                <>
                    <div className="fixed inset-0 z-[90] bg-black/30" onClick={closeAlert} />
                    <div className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(360px,calc(100vw-32px))] rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">알림</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-line">{internalAlert.message}</p>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={closeAlert}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

/**
 * 딜레이 함수
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 다건 조회 API를 사용하여 심볼 배열을 서버에 보내고 결과를 받음
 * API: /dart/main/cal/per_value/abroad/arr/v3?symbol=TSLA,AMZN,MSFT,...
 * @param {string[]} symbols - 조회할 심볼 배열
 * @param {Function} onProgress - 진행 상태 콜백 (current, total, currentBatch) => void
 */
async function defaultBulkFetcher(symbols, onProgress) {
    const results = [];
    const total = symbols.length;

    // 배치로 나누기
    const batches = [];
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        batches.push(symbols.slice(i, i + BATCH_SIZE));
    }

    let processed = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        const batchSymbols = batch.join(',');

        if (onProgress) {
            onProgress(processed, total, `배치 ${batchIdx + 1}/${batches.length} (${batch.length}건)`);
        }

        try {
            const sendUrl = `/dart/main/cal/per_value/abroad/arr/v3?symbol=${batchSymbols}`;
            const { data, error } = await send(sendUrl, {}, "GET");

            if (error == null && data && data.response) {
                // 응답이 배열인지 단일 객체인지 확인
                const responseList = Array.isArray(data.response) ? data.response : [data.response];

                for (let i = 0; i < responseList.length; i++) {
                    const responseData = responseList[i];
                    // 심볼은 응답 데이터 또는 요청 순서에서 추출
                    const symbolValue = responseData.symbol || responseData.티커 || responseData.상세정보?.symbol || batch[i];
                    const resData = {
                        기업명: responseData.기업명,
                        symbol: symbolValue,
                        현재가격: responseData.현재가격,
                        주당가치: responseData.주당가치,
                        peg: responseData.상세정보?.peg,
                        json: responseData,
                    };
                    results.push(resData);
                }
                processed += responseList.length;
            } else {
                // 배치 전체 실패 시 각 심볼에 대해 에러 기록
                for (const s of batch) {
                    results.push({ symbol: s, error: '조회 실패' });
                }
                processed += batch.length;
                console.log(`배치 ${batchIdx + 1} 조회 실패:`, batch, { data, error });
            }
        } catch (e) {
            // 배치 전체 실패 시 각 심볼에 대해 에러 기록
            for (const s of batch) {
                results.push({ symbol: s, error: e.message });
            }
            processed += batch.length;
            console.error(`배치 ${batchIdx + 1} 조회 중 오류 발생:`, e);
        }

        if (onProgress) {
            onProgress(processed, total, `배치 ${batchIdx + 1}/${batches.length} 완료`);
        }

        // 마지막 배치가 아니면 대기
        if (batchIdx < batches.length - 1) {
            await delay(BATCH_DELAY_MS);
        }
    }

    return results;
}

/**
 * Excel 생성 (exceljs 필요: npm i exceljs)
 * 컬럼: 번호, 한글명, 영문 공식명, 티커, 현재가격, 미래가격, PEG, JSON
 * 하이라이트:
 *  - 노란색: (현재가격 < 미래가격) && (PEG < 1.0)
 *  - 하늘색(두 경우):
 *      A) (현재가격 > 미래가격 && 가격차% <= 5%) || (PEG < 1.0)
 *      B) (현재가격 < 미래가격) || (1.0 <= PEG <= 1.3)
 *    ※ “가격차이 얼마안날때”는 5%로 가정(상수로 조정 가능)
 */
async function exportToExcel(items) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bulk');

    ws.columns = [
        { header: '번호', key: 'no', width: 6 },
        { header: '영문 공식명', key: '기업명', width: 36 },
        { header: '티커', key: 'symbol', width: 10 },
        { header: '현재가격', key: '현재가격', width: 12 },
        { header: '주당가치', key: '주당가치', width: 12 },
        { header: 'PEG', key: 'peg', width: 10 },
        { header: 'JSON', key: 'json', width: 50 },
    ];

    const pctCloseThreshold = 0.05; // 5%

    const toNum = (v) =>
        v == null ? NaN : typeof v === 'number' ? v : Number(String(v).replace(/[,\\s]/g, ''));

    items.forEach((it, idx) => {
        const cur = toNum(it.현재가격);
        const future = toNum(it.주당가치);
        const peg = toNum(it.peg);

        // PER 정보 추출 (있는 경우)
        const per = it.json?.상세정보?.per ? toNum(it.json.상세정보.per) :
            it.json?.per ? toNum(it.json.per) :
                it.json?.PER ? toNum(it.json.PER) : NaN;

        // 성장률보정PER 정보 추출 (있는 경우)
        const perAdj = it.json?.상세정보?.성장률보정PER ? toNum(it.json.상세정보.성장률보정PER) :
            it.json?.성장률보정PER ? toNum(it.json.성장률보정PER) : NaN;

        // 하이라이트 조건: PEG, PER, 성장률보정PER 중 하나라도 음수이면 제외
        const hasValidMetrics =
            Number.isFinite(peg) && peg > 0 &&
            (!Number.isFinite(per) || per > 0) &&
            (!Number.isFinite(perAdj) || perAdj > 0);

        const yellow =
            hasValidMetrics &&
            Number.isFinite(cur) && Number.isFinite(future) && cur < future && peg < 1.0;

        const closePct =
            Number.isFinite(cur) && Number.isFinite(future) && cur > future
                ? Math.abs((cur - future) / cur)
                : NaN;

        const sky =
            hasValidMetrics && !yellow && (
                ((Number.isFinite(closePct) && closePct <= pctCloseThreshold) && peg < 1.0) ||
                (cur < future && peg >= 1.0 && peg <= 1.5)
            );

        const row = ws.addRow({
            no: idx + 1,
            기업명: it.기업명 || '',
            symbol: it.symbol || '',
            현재가격: Number.isFinite(cur) ? cur : '',
            주당가치: Number.isFinite(future) ? future : '',
            peg: Number.isFinite(peg) ? peg : '',
            json: it.json ? JSON.stringify(it.json) : JSON.stringify(it),
        });

        const fillYellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } }; // amber-200
        const fillSky = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }; // sky-100

        if (yellow) row.eachCell((c) => (c.fill = fillYellow));
        else if (sky) row.eachCell((c) => (c.fill = fillSky));

        row.getCell('현재가격').numFmt = '#,##0.00';
        row.getCell('주당가치').numFmt = '#,##0.00';
        row.getCell('peg').numFmt = '0.00';
    });

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
        type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bulk_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}