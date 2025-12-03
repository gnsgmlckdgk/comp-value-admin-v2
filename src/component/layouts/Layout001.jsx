import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Header from '@/component/layouts/common/Header001';
import SideBar from '@/component/layouts/common/SideBar001';

function Layout001() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header onMenuClick={() => setIsSidebarOpen((prev) => !prev)} />

            <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0 px-3 pb-4 pt-3 md:gap-4 md:px-6">
                <SideBar isSidebarOpen={isSidebarOpen} setSidebarOpen={setIsSidebarOpen} />

                <main className="scrollbar-always relative flex-1 overflow-auto rounded-xl bg-white p-4 shadow-sm md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout001;