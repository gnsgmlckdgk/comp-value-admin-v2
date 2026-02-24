import { useState, useRef, useEffect, useCallback } from 'react';
import { useTab } from '@/context/TabContext';

export default function TabBar() {
    const { tabs, activeKey, switchTab, closeTab, closeOtherTabs, closeRightTabs } = useTab();
    const [contextMenu, setContextMenu] = useState(null);
    const scrollRef = useRef(null);
    const menuRef = useRef(null);

    // 컨텍스트 메뉴 외부 클릭 시 닫기
    useEffect(() => {
        if (!contextMenu) return;
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [contextMenu]);

    // 활성 탭이 바뀌면 스크롤로 보이게
    useEffect(() => {
        if (!scrollRef.current) return;
        const activeEl = scrollRef.current.querySelector('[data-active="true"]');
        if (activeEl) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }, [activeKey]);

    const handleContextMenu = useCallback((e, tab) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, tabKey: tab.key, closable: tab.closable });
    }, []);

    const handleMenuAction = useCallback((action) => {
        const key = contextMenu?.tabKey;
        setContextMenu(null);
        if (!key) return;
        if (action === 'close') closeTab(key);
        else if (action === 'closeOthers') closeOtherTabs(key);
        else if (action === 'closeRight') closeRightTabs(key);
    }, [contextMenu, closeTab, closeOtherTabs, closeRightTabs]);

    return (
        <div className="hidden md:block border-b border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
            <div
                ref={scrollRef}
                className="flex h-9 items-end overflow-x-auto px-6"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style>{`[data-tabscroll]::-webkit-scrollbar { display: none; }`}</style>
                {tabs.map((tab) => {
                    const isActive = tab.key === activeKey;
                    return (
                        <button
                            key={tab.key}
                            data-active={isActive}
                            onClick={() => switchTab(tab.key)}
                            onContextMenu={(e) => handleContextMenu(e, tab)}
                            className={`group relative flex shrink-0 items-center gap-1.5 px-3 pb-1.5 pt-1 text-xs transition-colors select-none ${
                                isActive
                                    ? 'text-sky-700 dark:text-sky-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            <span className="max-w-[120px] truncate">{tab.label}</span>
                            {tab.closable && (
                                <span
                                    onClick={(e) => { e.stopPropagation(); closeTab(tab.key); }}
                                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded opacity-0 hover:bg-slate-200 group-hover:opacity-100 dark:hover:bg-slate-700"
                                >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </span>
                            )}
                            {/* 활성 탭 하단 인디케이터 */}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 우클릭 컨텍스트 메뉴 */}
            {contextMenu && (
                <div
                    ref={menuRef}
                    className="fixed z-50 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.closable && (
                        <button
                            onClick={() => handleMenuAction('close')}
                            className="flex w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            닫기
                        </button>
                    )}
                    <button
                        onClick={() => handleMenuAction('closeOthers')}
                        className="flex w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        다른 탭 모두 닫기
                    </button>
                    <button
                        onClick={() => handleMenuAction('closeRight')}
                        className="flex w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        오른쪽 탭 모두 닫기
                    </button>
                </div>
            )}
        </div>
    );
}
