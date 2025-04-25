import { Link } from 'react-router-dom'
import routes from '../config/routes'

export default function Side() {
    return (
        <aside className="w-64 bg-white shadow-md p-6">
            <nav className="flex flex-col space-y-4">
                {Object.entries(routes).map(([key, route]) => (
                    route.show !== false ?
                        <Link className='text-gray-700 hover:text-blue-500' key={key} to={route.path}>{route.label}</Link> : ''
                ))}
            </nav>
        </aside>
    )
}