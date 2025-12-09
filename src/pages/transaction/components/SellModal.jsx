import { useState, useEffect } from 'react';
import Button from '@/component/common/button/Button';
import { fmtUsd } from '../utils/formatters';

/**
 * 매도 정보 입력 모달
 */
export default function SellModal({
    open,
    onClose,
    onConfirm,
    data,
    fx,
    saving,
}) {
    const [sellPrice, setSellPrice] = useState('');
    const [sellQty, setSellQty] = useState('');
    const [error, setError] = useState('');

    // 모달 열릴 때 초기화
    useEffect(() => {
        if (open) {
            setSellPrice(data?.currentPrice || '');
            setSellQty('');
            setError('');
        }
    }, [open, data]);

    if (!open || !data) return null;

    const { symbol, companyName, buyPrice, totalQty, currentPrice } = data;
    const maxQty = totalQty || 0;

    const handleSubmit = () => {
        const price = parseFloat(sellPrice);
        const qty = parseInt(sellQty, 10);

        if (!price || price <= 0) {
            setError('매도 가격을 입력해주세요.');
            return;
        }
        if (!qty || qty <= 0) {
            setError('매도 수량을 입력해주세요.');
            return;
        }
        if (qty > maxQty) {
            setError(`매도 수량은 보유 수량(${maxQty})을 초과할 수 없습니다.`);
            return;
        }

        setError('');
        onConfirm({
            symbol,
            companyName,
            sellPrice: price,
            sellQty: qty,
        });
    };

    const handleClose = () => {
        if (!saving) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-800 dark:text-white dark:ring-slate-700">
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                    매도 정보 입력
                </h2>

                {/* 거래 정보 표시 */}
                <div className="mb-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">티커</span>
                            <p className="font-medium dark:text-white">{symbol}</p>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">기업명</span>
                            <p className="font-medium dark:text-white">{companyName || '-'}</p>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">매수가격</span>
                            <p className="font-medium dark:text-white">
                                $ {fmtUsd(buyPrice)}
                                {fx && <span className="text-xs text-slate-400 ml-1">(₩{Math.round(buyPrice * fx).toLocaleString()})</span>}
                            </p>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400">보유수량</span>
                            <p className="font-medium dark:text-white">{maxQty}주</p>
                        </div>
                        <div className="col-span-2">
                            <span className="text-slate-500 dark:text-slate-400">현재가격</span>
                            <p className="font-medium dark:text-white">
                                $ {fmtUsd(currentPrice)}
                                {fx && <span className="text-xs text-slate-400 ml-1">(₩{Math.round(currentPrice * fx).toLocaleString()})</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 매도 정보 입력 */}
                <div className="space-y-4 mb-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            매도 가격 (USD)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={sellPrice}
                            onChange={(e) => setSellPrice(e.target.value)}
                            placeholder="매도 가격 입력"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            disabled={saving}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            매도 수량 (최대: {maxQty}주)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={maxQty}
                            value={sellQty}
                            onChange={(e) => setSellQty(e.target.value)}
                            placeholder="매도 수량 입력"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            disabled={saving}
                        />
                        <div className="mt-1 flex gap-2">
                            {[25, 50, 75, 100].map((pct) => (
                                <button
                                    key={pct}
                                    type="button"
                                    onClick={() => setSellQty(Math.floor(maxQty * pct / 100).toString())}
                                    className="px-2 py-0.5 text-xs rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white"
                                    disabled={saving}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 예상 실현손익 표시 */}
                {sellPrice && sellQty && (
                    <div className="mb-5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <div className="text-sm text-slate-600 dark:text-slate-300">예상 실현손익</div>
                        {(() => {
                            const pnl = (parseFloat(sellPrice) - buyPrice) * parseInt(sellQty || 0, 10);
                            const isPositive = pnl >= 0;
                            return (
                                <p className={`text-lg font-bold ${isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                    {isPositive ? '+' : ''}$ {fmtUsd(pnl)}
                                    {fx && (
                                        <span className="text-sm font-normal ml-2">
                                            (₩{Math.round(pnl * fx).toLocaleString()})
                                        </span>
                                    )}
                                </p>
                            );
                        })()}
                    </div>
                )}

                {/* 에러 메시지 */}
                {error && (
                    <div className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</div>
                )}

                {/* 버튼 */}
                <div className="flex justify-end gap-2">
                    <Button
                        onClick={handleClose}
                        className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500"
                        disabled={saving}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white"
                        disabled={saving}
                    >
                        {saving ? '처리 중...' : '매도'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
