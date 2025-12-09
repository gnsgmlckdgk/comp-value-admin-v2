import React, { useState } from 'react';
import Loading from '@/component/common/display/Loading';
import { send } from '@/util/ClientUtil';
import * as XLSX from 'xlsx'; // default export 없이 전체 import

/**
 * 날짜를 "yyyy-MM-dd HH:mm:ss" 형식의 문자열로 변환하는 함수
 * @param {Date} date 
 * @returns {string}
 */
const formatDate = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * 주어진 ms 동안 itemProgress를 0에서 100까지 업데이트하는 함수
 * @param {number} ms - 지연 시간 (밀리초)
 * @param {function} setItemProgress - itemProgress 업데이트 함수
 * @returns {Promise} - 지연이 완료되면 resolve하는 Promise
 */
const delayWithProgress = (ms, setItemProgress) => {
    return new Promise((resolve) => {
        let elapsed = 0;
        const interval = 100; // 100ms마다 업데이트
        setItemProgress(0);
        const timer = setInterval(() => {
            elapsed += interval;
            const progress = Math.min(100, Math.round((elapsed / ms) * 100));
            setItemProgress(progress);
            if (elapsed >= ms) {
                clearInterval(timer);
                resolve();
            }
        }, interval);
    });
};

const BulkCalcPopup = ({ onClose, year = new Date().getFullYear(), openAlert = (msg) => alert(msg) }) => {
    const [inputText, setInputText] = useState('');
    // 전체 진행도 상태 (예: { current: 3, total: 10 })
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    // 개별 항목 진행도 (0~100)
    const [itemProgress, setItemProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        setIsLoading(true);
        // 기업명을 줄바꿈 단위로 분리 (빈 줄 제거)
        const companyNames = inputText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');

        if (companyNames.length === 0) {
            openAlert('기업명을 입력해주세요.');
            setIsLoading(false);
            return;
        }

        setProgress({ current: 0, total: companyNames.length });
        const results = [];

        // 각 기업명에 대해 API 호출
        for (let i = 0; i < companyNames.length; i++) {
            const name = companyNames[i];
            try {
                const sendUrl = `/dart/main/cal/per_value?corp_name=${name}&corp_code=&year=${year}`;
                const { data, error } = await send(sendUrl, {}, 'GET');

                // 정상 응답이더라도 HttpStatus가 200이 아니면 오류 처리
                if (error || (data && data.httpStatus && data.httpStatus !== 200)) {
                    results.push({
                        '결과메시지': error || `응답 상태: ${data.httpStatus}`,
                        '기업명': name, // 입력한 기업명을 그대로 기록
                        '기업코드': '',
                        '주식코드': '',
                        '주당가치': '',
                        '현재가격': '',
                        '확인시간': formatDate(new Date()),
                        '비고': error || (data ? data.결과메시지 : ''),
                    });
                } else {
                    // 정상 응답의 경우, 만약 data.기업명이 없으면 입력한 name 사용하고,
                    // 그 경우 비고에 결과메시지(실제 응답 메시지)를 기록
                    const origMessage = data.결과메시지 || '';
                    const actualName = data.기업명 || name;
                    results.push({
                        '결과메시지': origMessage,
                        '기업명': actualName,
                        '기업코드': data.기업코드 || '',
                        '주식코드': data.주식코드 || '',
                        '주당가치': data.주당가치 || '',
                        '현재가격': data.현재가격 || '',
                        '확인시간': data.확인시간 || formatDate(new Date()),
                        '비고': origMessage,
                    });
                }
            } catch (err) {
                results.push({
                    '결과메시지': '요청 중 오류 발생',
                    '기업명': name,
                    '기업코드': '',
                    '주식코드': '',
                    '주당가치': '',
                    '현재가격': '',
                    '확인시간': formatDate(new Date()),
                    '비고': '요청 중 오류 발생',
                });
            }
            // 전체 진행도 업데이트
            setProgress({ current: i + 1, total: companyNames.length });
            // 각 항목 당 3초 지연과 함께 개별 진행도 업데이트
            await delayWithProgress(3000, setItemProgress);
        }

        // 결과 배열 변환:
        // - "기업명 입력"은 제거하고 "No" 컬럼 추가 (첫 번째 열)
        // - "결과메시지": '정상 처리되었습니다.'는 '정상', 그 외는 '오류'
        // - "비교" 컬럼 추가 = 주당가치 - 현재가격
        const transformedResults = results.map((row, idx) => {
            const newRow = { ...row };
            newRow['No'] = idx + 1;
            const origMessage = newRow['결과메시지'];
            newRow['결과메시지'] =
                origMessage === '정상 처리되었습니다.' ? '정상' : '오류';
            const perValue = Number(newRow['주당가치']) || 0;
            const currentPrice = Number(newRow['현재가격']) || 0;
            newRow['비교'] = perValue - currentPrice;
            return newRow;
        });

        // 원하는 컬럼 순서:
        // No, 결과메시지, 기업명, 기업코드, 주식코드, 주당가치, 현재가격, 비교, 확인시간, 비고
        const headerOrder = [
            'No',
            '결과메시지',
            '기업명',
            '기업코드',
            '주식코드',
            '주당가치',
            '현재가격',
            '비교',
            '확인시간',
            '비고',
        ];
        const worksheet = XLSX.utils.json_to_sheet(transformedResults, {
            header: headerOrder,
        });

        // 헤더 스타일 적용: 중앙 정렬, 굵게 처리
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = {
                    font: { bold: true },
                    alignment: { horizontal: 'center' },
                };
            }
        }

        // 컬럼 너비 설정 (wch: width in characters)
        worksheet['!cols'] = [
            { wch: 5 }, // No
            { wch: 13 }, // 결과메시지
            { wch: 20 }, // 기업명
            { wch: 13 }, // 기업코드
            { wch: 11 }, // 주식코드
            { wch: 12 }, // 주당가치
            { wch: 12 }, // 현재가격
            { wch: 12 }, // 비교
            { wch: 20 }, // 확인시간
            { wch: 20 }, // 비고
        ];

        // 데이터 행에서 "주당가치"가 "현재가격"보다 높으면 해당 셀에 스타일 적용 (빨간색, 굵게)
        const perValueColIndex = headerOrder.indexOf('주당가치');
        const currentPriceColIndex = headerOrder.indexOf('현재가격');
        if (perValueColIndex !== -1 && currentPriceColIndex !== -1) {
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const perCellAddr = XLSX.utils.encode_cell({ r: R, c: perValueColIndex });
                const curCellAddr = XLSX.utils.encode_cell({ r: R, c: currentPriceColIndex });
                const perCell = worksheet[perCellAddr];
                const curCell = worksheet[curCellAddr];
                const perVal = perCell && perCell.v ? Number(perCell.v) : 0;
                const curVal = curCell && curCell.v ? Number(curCell.v) : 0;
                if (perVal > curVal && perCell) {
                    perCell.s = { font: { bold: true, color: { rgb: 'FF0000' } } };
                }
            }
        }

        // 워크북 생성 및 시트 추가
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '결과');
        XLSX.writeFile(workbook, '기업가치_결과.xlsx');

        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
            <Loading show={isLoading} />
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-4/5 max-w-xl relative sm:w-11/12 sm:p-4">

                <h2 className="text-slate-900 dark:text-white">기업명 일괄 계산</h2>
                <p className="text-slate-700 dark:text-slate-300">기업명을 한 줄에 하나씩 입력하세요:</p>
                <textarea
                    className="w-full h-52 p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded resize-y sm:h-40"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="예:\n삼성전자\nLG전자\n현대자동차"
                />
                {/* 전체 진행도 텍스트 */}
                <div className="mt-2 text-center font-bold text-slate-900 dark:text-white sm:text-sm">
                    {progress.total > 0 &&
                        `${progress.current}/${progress.total}건 (${Math.round(
                            (progress.current / progress.total) * 100
                        )}%)`}
                </div>
                {/* 개별 항목 진행도 프로그래스바 */}
                <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded mt-1">
                    <div
                        className="h-full bg-gray-800 dark:bg-slate-400 rounded transition-all duration-100 ease-linear"
                        style={{ width: `${itemProgress}%` }}
                    />
                </div>
                <div className="mt-2 text-right sm:text-center">
                    <button
                        className="mr-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-slate-700 dark:to-slate-800 text-white rounded cursor-pointer sm:px-3 sm:text-sm sm:mr-1"
                        onClick={onClose}
                    >
                        취소
                    </button>
                    <button
                        className="mr-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-slate-700 dark:to-slate-800 text-white rounded cursor-pointer sm:px-3 sm:text-sm sm:mr-1"
                        onClick={handleSubmit}
                    >
                        전송
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkCalcPopup;
