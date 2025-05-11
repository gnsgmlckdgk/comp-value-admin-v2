import { useState } from 'react';
import { Outlet } from 'react-router-dom'

import Header from '@/component/layouts/common/Header001'
import SideBar from '@/component/layouts/common/SideBar001'

function Layout001() {

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className='flex flex-col min-h-screen'>
            {/* 헤더 */}
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

            {/* 본문 영역 */}
            <div className="flex flex-1 overflow-hidden">

                {/* 사이드바 */}
                <SideBar isSidebarOpen={isSidebarOpen} />

                {/* 메인 컨텐츠 */}
                <main className='flex-1 bg-white p-6 overflow-auto'>
                    <Outlet></Outlet>
                </main>
            </div>
        </div>
    )
}

export default Layout001;