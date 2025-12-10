import { useState, useEffect } from 'react';

export default function SellRecordModal({ isOpen, mode, data, onClose, onSave }) {
    const [formData, setFormData] = useState({
        symbol: '',
        companyName: '',
        sellDate: new Date().toISOString().split('T')[0],
        sellPrice: '',
        sellQty: '',
        realizedPnl: '',
        rmk: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && data) {
            setFormData({
                symbol: data.symbol || '',
                companyName: data.companyName || '',
                sellDate: data.sellDate || new Date().toISOString().split('T')[0],
                sellPrice: data.sellPrice || '',
                sellQty: data.sellQty || '',
                realizedPnl: data.realizedPnl || '',
                rmk: data.rmk || '',
            });
        } else {
            setFormData({
                symbol: '',
                companyName: '',
                sellDate: new Date().toISOString().split('T')[0],
                sellPrice: '',
                sellQty: '',
                realizedPnl: '',
                rmk: '',
            });
        }
    }, [mode, data, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        // 유효성 검사
        if (!formData.symbol.trim()) {
            alert('티커를 입력해주세요.');
            return;
        }
        if (!formData.companyName.trim()) {
            alert('기업명을 입력해주세요.');
            return;
        }
        if (!formData.sellDate) {
            alert('매도일을 입력해주세요.');
            return;
        }
        if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
            alert('올바른 매도가를 입력해주세요.');
            return;
        }
        if (!formData.sellQty || parseInt(formData.sellQty) <= 0) {
            alert('올바른 수량을 입력해주세요.');
            return;
        }

        setSaving(true);
        const success = await onSave({
            symbol: formData.symbol.trim(),
            companyName: formData.companyName.trim(),
            sellDate: formData.sellDate,
            sellPrice: parseFloat(formData.sellPrice),
            sellQty: parseInt(formData.sellQty),
            realizedPnl: parseFloat(formData.realizedPnl) || 0,
            rmk: formData.rmk.trim() || null,
        });
        setSaving(false);

        if (success) {
            // 모달은 부모에서 닫음
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const totalAmount = (parseFloat(formData.sellPrice) || 0) * (parseInt(formData.sellQty) || 0);

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
            onClick={handleOverlayClick}
        >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-lg bg-white shadow-xl dark:bg-slate-800">
                {/* 헤더 */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {mode === 'edit' ? '매도 기록 수정' : '매도 기록 추가'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 티커 */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                티커 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.symbol}
                                onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
                                placeholder="AAPL"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>

                        {/* 기업명 */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                기업명 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.companyName}
                                onChange={(e) => handleChange('companyName', e.target.value)}
                                placeholder="Apple Inc."
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>

                        {/* 매도일 */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                매도일 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.sellDate}
                                onChange={(e) => handleChange('sellDate', e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>

                        {/* 매도가 */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                매도가 ($) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.sellPrice}
                                onChange={(e) => handleChange('sellPrice', e.target.value)}
                                placeholder="150.50"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>

                        {/* 수량 */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                수량 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.sellQty}
                                onChange={(e) => handleChange('sellQty', e.target.value)}
                                placeholder="10"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>

                        {/* 실현손익 */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                실현손익 ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.realizedPnl}
                                onChange={(e) => handleChange('realizedPnl', e.target.value)}
                                placeholder="500.00"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* 비고 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            비고
                        </label>
                        <textarea
                            value={formData.rmk}
                            onChange={(e) => handleChange('rmk', e.target.value)}
                            placeholder="메모를 입력하세요..."
                            rows={3}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white resize-none"
                        />
                    </div>

                    {/* 계산 요약 */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">매도 금액 (매도가 × 수량)</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                                ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-lg hover:from-sky-600 hover:to-indigo-600 transition-all shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? '저장 중...' : mode === 'edit' ? '수정' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
