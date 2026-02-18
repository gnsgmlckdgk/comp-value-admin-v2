export function isNumeric(value) {
    if (value === '' || value == null) return false;
    return !isNaN(value) && !isNaN(parseFloat(value));
}

export function compareValues(a, b, direction) {
    const aNum = isNumeric(a);
    const bNum = isNumeric(b);

    let result;
    if (aNum && bNum) {
        result = Number(a) - Number(b);
    } else {
        const aStr = a == null ? '' : String(a);
        const bStr = b == null ? '' : String(b);
        result = aStr.localeCompare(bStr, 'ko');
    }

    return direction === 'desc' ? -result : result;
}

/**
 * 헤더 + 데이터 샘플을 기반으로 컬럼별 초기 너비를 계산한다.
 * 한글은 영문 대비 약 1.6배 폭으로 근사한다.
 * @returns {{ [colIdx: number]: number }}
 */
export function calcInitialWidths(headers, rows) {
    const SAMPLE_SIZE = 100;
    const CHAR_PX = 8;        // 영문 1글자 근사 폭
    const KO_RATIO = 1.6;     // 한글/영문 폭 비율
    const PADDING = 40;       // 셀 패딩 + 정렬/필터 아이콘 여유
    const MIN = 60;
    const MAX = 400;

    const sample = rows.length > SAMPLE_SIZE
        ? rows.filter((_, i) => i % Math.ceil(rows.length / SAMPLE_SIZE) === 0)
        : rows;

    const measure = (str) => {
        const s = str == null ? '' : String(str);
        let width = 0;
        for (let i = 0; i < s.length; i++) {
            width += s.charCodeAt(i) > 127 ? CHAR_PX * KO_RATIO : CHAR_PX;
        }
        return width;
    };

    const widths = {};
    for (let col = 0; col < headers.length; col++) {
        let maxW = measure(headers[col]);
        for (const row of sample) {
            const val = col < row.length ? row[col] : '';
            const w = measure(val);
            if (w > maxW) maxW = w;
        }
        widths[col] = Math.min(MAX, Math.max(MIN, maxW + PADDING));
    }
    return widths;
}

export function exportToCsv(headers, rows, filename = 'export.csv') {
    const escape = (val) => {
        const str = val == null ? '' : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const lines = [
        headers.map(escape).join(','),
        ...rows.map((row) => row.map(escape).join(',')),
    ];

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + lines.join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
