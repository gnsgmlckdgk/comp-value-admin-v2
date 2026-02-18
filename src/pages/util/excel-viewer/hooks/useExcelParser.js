import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

/** 셀 스타일에서 배경색(#rrggbb)을 추출. 없으면 null */
function extractBgColor(cell) {
    if (!cell || !cell.s) return null;
    const s = cell.s;

    // 패턴 채우기가 없으면 무시
    if (!s.fgColor && !s.patternType) return null;
    if (s.patternType === 'none') return null;

    const color = s.fgColor;
    if (!color) return null;

    // rgb 직접 지정 (가장 흔함)
    if (color.rgb) {
        const rgb = color.rgb;
        // ARGB(8자리)면 앞 2글자(alpha) 제거
        return '#' + (rgb.length === 8 ? rgb.slice(2) : rgb);
    }

    return null;
}

export default function useExcelParser() {
    const [workbook, setWorkbook] = useState(null);
    const [sheetNames, setSheetNames] = useState([]);
    const [activeSheet, setActiveSheet] = useState('');
    const [sheetData, setSheetData] = useState([]);
    const [cellColors, setCellColors] = useState(null); // { "row,col": "#rrggbb" }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileName, setFileName] = useState('');
    const [rowCount, setRowCount] = useState(0);
    const [colCount, setColCount] = useState(0);

    const extractSheetData = useCallback((wb, sheetName) => {
        const sheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        setSheetData(data);
        setRowCount(data.length > 0 ? data.length - 1 : 0);
        setColCount(data.length > 0 ? data[0].length : 0);

        // 셀 배경색 추출
        const colors = {};
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        let hasAny = false;
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const bg = extractBgColor(sheet[addr]);
                if (bg) {
                    colors[`${r},${c}`] = bg;
                    hasAny = true;
                }
            }
        }
        setCellColors(hasAny ? colors : null);
    }, []);

    const parseFile = useCallback((file) => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
            setError(`지원하지 않는 파일 형식입니다. (${ACCEPTED_EXTENSIONS.join(', ')})`);
            return;
        }

        setLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array', cellStyles: true });

                setWorkbook(wb);
                setSheetNames(wb.SheetNames);
                setActiveSheet(wb.SheetNames[0]);
                setFileName(file.name);
                extractSheetData(wb, wb.SheetNames[0]);
            } catch (err) {
                setError('파일을 읽는 중 오류가 발생했습니다: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        reader.onerror = () => {
            setError('파일을 읽는 중 오류가 발생했습니다.');
            setLoading(false);
        };
        reader.readAsArrayBuffer(file);
    }, [extractSheetData]);

    const changeSheet = useCallback((sheetName) => {
        if (!workbook) return;
        setActiveSheet(sheetName);
        extractSheetData(workbook, sheetName);
    }, [workbook, extractSheetData]);

    const reset = useCallback(() => {
        setWorkbook(null);
        setSheetNames([]);
        setActiveSheet('');
        setSheetData([]);
        setCellColors(null);
        setLoading(false);
        setError(null);
        setFileName('');
        setRowCount(0);
        setColCount(0);
    }, []);

    return {
        sheetNames,
        activeSheet,
        sheetData,
        cellColors,
        loading,
        error,
        fileName,
        rowCount,
        colCount,
        parseFile,
        changeSheet,
        reset,
    };
}
