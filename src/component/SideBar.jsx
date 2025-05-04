import { Link } from 'react-router-dom'
import routes from '../config/routes'

export default function SideBar({ isSidebarOpen }) {
    return (
        <aside className={`${isSidebarOpen ? 'block' : 'hidden'} md:block w-64 bg-gray-100 overflow-auto`}>

            <nav className="flex flex-col space-y-4 p-6">

                <h2 className='text-gray-700 font-extrabold'>시작하기</h2>
                {Object.entries(routes).map(([key, route]) => (
                    route.show !== false && route.section === "시작하기" ?
                        <Link className='text-gray-700 hover:text-blue-500 pl-6 border-l-2 border-gray-300' key={key} to={route.path}>{route.label}</Link> : ''
                ))}

                <h2 className='text-gray-700 font-extrabold'>기업분석</h2>
                {Object.entries(routes).map(([key, route]) => (
                    route.show !== false && route.section === "기업분석" ?
                        <Link className='text-gray-700 hover:text-blue-500 pl-6 border-l-2 border-gray-300' key={key} to={route.path}>{route.label}</Link> : ''
                ))}

                <h2 className='text-gray-700 font-extrabold'>게시판</h2>
                {Object.entries(routes).map(([key, route]) => (
                    route.show !== false && route.section === "게시판" ?
                        <Link className='text-gray-700 hover:text-blue-500 pl-6 border-l-2 border-gray-300' key={key} to={route.path}>{route.label}</Link> : ''
                ))}

            </nav>
        </aside>
    )
}