// 환차손익 계산: 매수원가($) = 매도금액($) - 실현손익($), 환차손익(₩) = 매수원가($) × (매도당시환율 - 매수당시환율)
export function calcFxPnl(record) {
    const { sellPrice, sellQty, realizedPnl, buyExchangeRateAtTrade, sellExchangeRateAtTrade } = record;
    if (!buyExchangeRateAtTrade || !sellExchangeRateAtTrade) return null;
    const buyCostUsd = sellPrice * sellQty - realizedPnl;
    return buyCostUsd * (sellExchangeRateAtTrade - buyExchangeRateAtTrade);
}
