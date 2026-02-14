/**
 * 테이블 헤더 정의
 */
export const TABLE_HEADERS = [
    '종목',
    '매수가($)',
    '현재가($)',
    '수량',
    '매수금액($)',
    '평가금액($)',
    '손익',
    '매수일자',
];

/**
 * 테이블 컬럼 너비 정의
 */
export const COLUMN_WIDTHS = [
    'w-48',   // 종목
    'w-28',   // 매수가($)
    'w-28',   // 현재가($)
    'w-20',   // 수량
    'w-32',   // 매수금액($)
    'w-32',   // 평가금액($)
    'w-36',   // 손익
    'w-28',   // 매수일자
];

/**
 * 정렬 가능한 컬럼 인덱스
 */
export const SORTABLE_COLUMNS = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * 필터 모드
 */
export const FILTER_MODES = { ALL: 'all', PROFIT: 'profit', LOSS: 'loss' };

/**
 * 신규 행 초기값
 */
export const INITIAL_NEW_ROW = {
    symbol: '',
    companyName: '',
    buyPrice: '',
    totalBuyAmount: '',
    buyDate: '',
    currentPrice: '',
    targetPrice: '',
    rmk: '',
};
