// 환차손익 계산: 매수원가($) = 매도금액($) - 실현손익($), 환차손익(₩) = 매수원가($) × (매도당시환율 - 매수당시환율)
export function calcFxPnl(record) {
    const { sellPrice, sellQty, realizedPnl, buyExchangeRateAtTrade, sellExchangeRateAtTrade } = record;
    if (!buyExchangeRateAtTrade || !sellExchangeRateAtTrade) return null;
    const buyCostUsd = sellPrice * sellQty - realizedPnl;
    return buyCostUsd * (sellExchangeRateAtTrade - buyExchangeRateAtTrade);
}

// 총손익(₩) = 가격손익 원화환산(실현손익 × 매도당시환율) + 환차손익. 환율 정보 없으면 가격손익만 반영
export function calcTotalPnlKrw(record, fallbackFxRate) {
    const sellRate = record.sellExchangeRateAtTrade || fallbackFxRate;
    if (!sellRate) return null;
    const priceGainKrw = record.realizedPnl * sellRate;
    const fxPnl = calcFxPnl(record);
    return priceGainKrw + (fxPnl || 0);
}
