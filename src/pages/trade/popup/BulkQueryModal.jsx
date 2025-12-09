import { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';

import { send } from '@/util/ClientUtil';


/**
 * 대량조회 모달
 * props:
 *  - open: boolean
 *  - onClose: () => void
 *  - fetcher?: (symbols: string[]) => Promise<Array<any>>
 *      // 백단 연동 함수(주입 가능). 미주입 시 defaultBulkFetcher 사용
 *  - openAlert?: (msg: string) => void
 */
export default function BulkQueryModal({ open, onClose, fetcher, openAlert = (msg) => alert(msg) }) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

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
            openAlert('심볼을 한 줄에 하나씩 입력해주세요.');
            return;
        }
        setLoading(true);

        try {
            const fn = fetcher || defaultBulkFetcher;
            const items = await fn(symbols); // [{koreanName,englishName,symbol,currentPrice,futurePrice,peg,raw}, ...]
            await exportToExcel(Array.isArray(items) ? items : []);
        } catch (e) {
            console.error(e);
            openAlert('조회/엑셀 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
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
                    </p>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={'예)\nAAPL\nMSFT\nGOOGL\nNVDA'}
                        className="w-full h-[220px] rounded-md border border-slate-300 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    />

                    <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] text-slate-500 dark:text-slate-400">{symbols.length}개 심볼</div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="px-3 py-2 rounded-md border text-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                onClick={() => setInput('')}
                                disabled={loading}
                            >
                                초기화
                            </button>
                            <button
                                type="button"
                                className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-60"
                                onClick={run}
                                disabled={loading}
                            >
                                {loading ? '처리 중…' : '엑셀로 내보내기'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * (백단 연동 함수 틀) 심볼 배열을 서버에 보내고 결과를 받도록 구현하세요.
 * 반환 예시 스키마:
 *  [
 *    { englishName, symbol, currentPrice, futurePrice, peg, raw: 원본객체 },
 *    ...
 *  ]
 */
async function defaultBulkFetcher(symbols) {
    console.warn('defaultBulkFetcher: 실제 백단 연동을 구현하세요.', symbols);

    const results = [];

    for (const s of symbols) {
        console.log(s);
        const sendUrl = `/dart/main/cal/per_value/abroad/v2?symbol=${s}`;
        const { data, error } = await send(sendUrl, {}, "GET");

        if (error == null && data && data.response && Object.keys(data.response).length > 0) {
            const responseData = data.response;
            console.log("responseData", responseData);

            const resData = {
                기업명: responseData.기업명,
                symbol: s,
                현재가격: responseData.현재가격,
                주당가치: responseData.주당가치,
                peg: responseData.상세정보.peg,
                json: responseData,
            };
            results.push(resData);

        } else {
            const resData = {
                symbol: s
            };
            results.push(resData);
            console.log(s, '조회 결과가 존재하지 않거나 서버 응답을 받지 못했습니다.');
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