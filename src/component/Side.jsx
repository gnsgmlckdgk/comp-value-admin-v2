import { Link } from 'react-router-dom'
import routes from '../config/routes'

export default function Side({ isSidebarOpen }) {
    return (
        <aside className={`${isSidebarOpen ? 'block' : 'hidden'} md:block w-64 bg-gray-100 overflow-auto`}>

            <nav className="flex flex-col space-y-4 p-6">
                {Object.entries(routes).map(([key, route]) => (
                    route.show !== false ?
                        <Link className='text-gray-700 hover:text-blue-500' key={key} to={route.path}>{route.label}</Link> : ''
                ))}
            </nav>
        </aside>
    )
}