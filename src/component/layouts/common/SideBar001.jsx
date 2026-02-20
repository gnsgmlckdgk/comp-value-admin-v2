import { Link, useLocation } from 'react-router-dom';
import routes from '@/config/routes';
import { useState, useEffect } from 'react';
import { hasAnyRole } from '@/util/RoleUtil';
import { useAuth } from '@/context/AuthContext';

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);
    return isMobile;
}

export const SECTIONS = ['시작하기', '기업분석(국내)_DEP', '기업분석(미국)', '거래', '게시판', '코인', '유틸', '모니터링'];

export default function SideBar001({ isSidebarOpen, setSidebarOpen, setIsPinned, onMouseEnter, onMouseLeave }) {
    const isMobile = useIsMobile();
    const location = useLocation();
    const { roles: userRoles } = useAuth();

    const handleLinkClick = () => {
        if (isMobile && setSidebarOpen) {
            setSidebarOpen(false);
            setIsPinned && setIsPinned(false);
        }
    };

    const renderSection = (sectionLabel) => {
        const items = Object.entries(routes).filter(
            ([, route]) => {
                // show가 false이면 숨김
                if (route.show === false) return false;
                // 섹션이 일치하지 않으면 숨김
                if (route.section !== sectionLabel) return false;
                // requiredRoles가 있으면 권한 체크
                if (route.requiredRoles && route.requiredRoles.length > 0) {
                    return hasAnyRole(userRoles, route.requiredRoles);
                }
                return true;
            }
        );
        if (!items.length) return null;

        return (
            <div key={sectionLabel} className="mt-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <span>{sectionLabel}</span>
                </div>
                <div className="space-y-1">
                    {items.map(([key, route]) => {
                        const isActive = location.pathname === route.path;
                        return (
                            <Link
                                key={key}
                                to={route.path}
                                onClick={handleLinkClick}
                                className={`flex items-center rounded-md px-3 py-2 text-sm transition-all ${
                                    isActive
                                        ? 'bg-sky-50 text-sky-700 font-semibold border border-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                                }`}
                            >
                                <span className="truncate">{route.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <aside
            className={`${
                isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
            } fixed inset-y-16 left-0 z-30 w-60 transform border-r border-slate-200 bg-white/95 px-3 py-4 text-sm shadow-lg transition-all duration-200 ease-out md:static md:inset-y-0 md:translate-x-0 md:opacity-100 md:w-64 md:bg-white md:shadow-none dark:bg-slate-900/95 dark:border-slate-700 md:dark:bg-slate-900`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <nav className="scrollbar-always flex h-full flex-col overflow-y-auto pb-6">
                {SECTIONS.map(renderSection)}
            </nav>
        </aside>
    );
}