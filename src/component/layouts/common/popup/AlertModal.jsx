import Button from '@/component/common/button/Button';

export default function AlertModal({ open, title = '알림', message, onClose }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-xl ring-1 ring-slate-900/5">
                <h2 className="mb-2 text-base font-semibold text-slate-900">{title}</h2>
                <p className="mb-5 whitespace-pre-line text-sm text-slate-600">{message}</p>
                <div className="flex justify-end">
                    <Button
                        children="확인"
                        onClick={onClose}
                        className="px-4 py-1.5"
                    />
                </div>
            </div>
        </div>
    );
}



