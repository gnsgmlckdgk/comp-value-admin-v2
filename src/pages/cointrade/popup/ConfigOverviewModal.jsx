import { Fragment } from 'react';
import Button from '@/component/common/button/Button';

export default function ConfigOverviewModal({ 
    isOpen, 
    onClose, 
    params, 
    getParamLabel, 
    getParamDescription,
    paramGroups 
}) {
    if (!isOpen) return null;

    // Flatten all keys from groups to preserve order if needed, or just iterate params
    // Using paramGroups to keep the logical grouping order
    const allKeys = [];
    if (paramGroups) {
        Object.values(paramGroups).forEach(group => {
            allKeys.push(...group.keys);
        });
    } else {
        // Fallback if groups not provided
        allKeys.push(...Object.keys(params));
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div 
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                    aria-hidden="true" 
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="relative z-10 inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                    
                    {/* Header */}
                    <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="sm:flex sm:items-start justify-between">
                            <h3 className="text-lg leading-6 font-medium text-slate-900 dark:text-slate-100" id="modal-title">
                                설정값 한눈에 보기
                            </h3>
                            <button
                                onClick={onClose}
                                type="button"
                                className="bg-white dark:bg-slate-800 rounded-md text-slate-400 hover:text-slate-500 focus:outline-none"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-4 sm:p-6 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-800">
                        {allKeys.length === 0 ? (
                            <div className="text-center text-slate-500 py-10">
                                표시할 파라미터가 없습니다.
                            </div>
                        ) : (
                            <>
                                {/* 데스크톱 테이블 뷰 */}
                                <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-700">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider w-1/4 border-r border-slate-200 dark:border-slate-600 last:border-0">
                                                    Name
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider w-1/6 border-r border-slate-200 dark:border-slate-600 last:border-0">
                                                    Value
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider w-1/5 border-r border-slate-200 dark:border-slate-600 last:border-0">
                                                    Key
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                                    Description
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                            {Object.entries(paramGroups).map(([groupKey, group]) => (
                                                <Fragment key={groupKey}>
                                                    <tr className="bg-slate-50 dark:bg-slate-900/50">
                                                        <td colSpan="4" className="px-4 py-2 font-bold text-blue-700 dark:text-blue-400 border-b border-slate-200 dark:border-slate-700">
                                                            [{group.label}]
                                                        </td>
                                                    </tr>
                                                    {group.keys.map((key) => (
                                                        <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 align-middle font-bold border-r border-slate-100 dark:border-slate-700/50">
                                                                {getParamLabel(key)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center align-middle border-r border-slate-100 dark:border-slate-700/50">
                                                                <span className="inline-block px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-900 dark:text-slate-100 shadow-sm">
                                                                    {params[key] !== undefined && params[key] !== null && params[key] !== '' ? params[key] : <span className="text-slate-400 italic font-normal">Empty</span>}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 align-middle border-r border-slate-100 dark:border-slate-700/50">
                                                                {key}
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 align-middle whitespace-pre-wrap leading-relaxed">
                                                                {getParamDescription(key)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 모바일 카드 뷰 */}
                                <div className="md:hidden space-y-4">
                                    {Object.entries(paramGroups).map(([groupKey, group]) => (
                                        <div key={groupKey} className="space-y-3">
                                            {/* 그룹 헤더 */}
                                            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <h4 className="font-bold text-blue-700 dark:text-blue-400">
                                                    [{group.label}]
                                                </h4>
                                            </div>

                                            {/* 카드 목록 */}
                                            {group.keys.map((key) => (
                                                <div
                                                    key={key}
                                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm space-y-3"
                                                >
                                                    {/* Name */}
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                            Name
                                                        </div>
                                                        <div className="font-bold text-slate-700 dark:text-slate-300">
                                                            {getParamLabel(key)}
                                                        </div>
                                                    </div>

                                                    {/* Value */}
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                            Value
                                                        </div>
                                                        <div className="inline-block px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-900 dark:text-slate-100 shadow-sm">
                                                            {params[key] !== undefined && params[key] !== null && params[key] !== '' ? params[key] : <span className="text-slate-400 italic font-normal">Empty</span>}
                                                        </div>
                                                    </div>

                                                    {/* Key */}
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                            Key
                                                        </div>
                                                        <div className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 inline-block">
                                                            {key}
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                            Description
                                                        </div>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                                            {getParamDescription(key)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200 dark:border-slate-700">
                        <Button
                            onClick={onClose}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-slate-600 text-base font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            닫기
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
