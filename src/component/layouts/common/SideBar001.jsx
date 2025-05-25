import { Link } from 'react-router-dom'
import routes from '@/config/routes'
import { useState, useEffect } from 'react';

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);
    return isMobile;
}

export default function SideBar001({ isSidebarOpen, setSidebarOpen }) {
    const isMobile = useIsMobile();
    return (
        <aside
            className={`
                        ${isSidebarOpen ? 'block' : 'hidden'}
                        md:block
                        bg-gray-100 overflow-auto z-40
                        md:static md:w-64
                        absolute top-14 left-0 w-full
                    `}>
            <nav className="flex flex-col space-y-4 p-6">

                <h2 className='text-gray-700 font-extrabold'>시작하기</h2>
                {Object.entries(routes).map(([key, route]) => (
                    route.show !== false && route.section === "시작하기" ?
                        <Link onClick={() => isMobile && setSidebarOpen(false)} className='text-gray-700 hover:text-blue-500 pl-6 border-l-2 border-gray-300' key={key} to={route.path}>{route.label}</Link> : ''
                ))}

                <h2 className='text-gray-700 font-extrabold'>기업분석</h2>
                {Object.entries(routes).map(([key, route]) => (
                    route.show !== false && route.section === "기업분석" ?
                        <Link onClick={() => isMobile && setSidebarOpen(false)} className='text-gray-700 hover:text-blue-500 pl-6 border-l-2 border-gray-300' key={key} to={route.path}>{route.label}</Link> : ''
                ))}

                <h2 className='text-gray-700 font-extrabold'>게시판</h2>
                {Object.entries(routes).map(([key, route]) => (
                    route.show !== false && route.section === "게시판" ?
                        <Link onClick={() => isMobile && setSidebarOpen(false)} className='text-gray-700 hover:text-blue-500 pl-6 border-l-2 border-gray-300' key={key} to={route.path}>{route.label}</Link> : ''
                ))}

            </nav>
        </aside>
    )
}