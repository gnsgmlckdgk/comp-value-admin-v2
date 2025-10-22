// TransactionService.jsx
// 실제 백엔드 API와 연동하거나, 현재는 모킹 데이터를 반환하는 예시 서비스

let _mock = [
    {
        id: 1,
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        buyPrice: 180.12,
        totalBuyAmount: 10,
        buyDate: '2025-09-15',
        currentPrice: 195.42,
        targetPrice: 220,
    },
    {
        id: 2,
        symbol: 'MSFT',
        companyName: 'Microsoft',
        buyPrice: 400.0,
        totalBuyAmount: 5,
        buyDate: '2025-08-10',
        currentPrice: 415.2,
        targetPrice: 450,
    },
    {
        id: 3,
        symbol: 'NVDA',
        companyName: 'NVIDIA',
        buyPrice: 900.0,
        totalBuyAmount: 2,
        buyDate: '2025-10-01',
        currentPrice: 920.0,
        targetPrice: 1000,
    },
];

let _id = 4;

// 거래내역 조회
export async function fetchTransactions() {
    await delay(200);
    return _mock.slice();
}

// 거래내역 등록
export async function createTransaction(payload) {
    await delay(200);
    _mock.push({ id: _id++, ...payload });
    return true;
}

// 거래내역 수정
export async function updateTransaction(id, patch) {
    await delay(150);
    const idx = _mock.findIndex((x) => x.id === id);
    if (idx >= 0) {
        _mock[idx] = { ..._mock[idx], ...normalizePatch(patch) };
        return _mock[idx];
    }
    throw new Error('not found');
}

// 거래내역 삭제
export async function deleteTransaction(id) {
    await delay(150);
    _mock = _mock.filter((x) => x.id !== id);
    return true;
}

// 현재가격 갱신 (랜덤 변동)
export async function refreshCurrentPrices(ids) {
    await delay(400);
    _mock = _mock.map((x) =>
        ids.includes(x.id)
            ? { ...x, currentPrice: Number((Number(x.currentPrice) * (0.99 + Math.random() * 0.02)).toFixed(2)) }
            : x
    );
    return _mock.filter((x) => ids.includes(x.id));
}

function delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

function normalizePatch(patch) {
    const p = { ...patch };
    ['buyPrice', 'totalBuyAmount', 'currentPrice', 'targetPrice'].forEach((k) => {
        if (p[k] != null && p[k] !== '') p[k] = Number(p[k]);
    });
    return p;
}