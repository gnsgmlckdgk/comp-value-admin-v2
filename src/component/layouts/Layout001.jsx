import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Header from '@/component/layouts/common/Header001';
import SideBar from '@/component/layouts/common/SideBar001';

function Layout001() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <Header onMenuClick={() => setIsSidebarOpen((prev) => !prev)} />

            {/* 모바일에서 사이드바가 열렸을 때 배경 클릭 시 닫히는 오버레이 */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-16 inset-x-0 z-20 bg-black/20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex w-full flex-1 gap-0 px-3 pb-4 pt-3 md:gap-4 md:px-6">
                <SideBar isSidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

                <main className="scrollbar-always relative flex-1 overflow-auto rounded-xl bg-white p-4 shadow-sm md:p-6 dark:bg-slate-900 dark:shadow-slate-800/30">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout001;