import { useState } from 'react'
import { Link } from 'react-router-dom'
import routes from '../config/routes'

export default function Header({ onMenuClick }) {

    const [title, setTitle] = useState('CompValue');

    return (
        <header className="h-16 bg-sky-600 text-white flex items-center px-4 shadow-md">
            <button
                className='md:hidden text-gray-200 focus:outline-none pr-3'
                onClick={onMenuClick}>

                {/* 햄버거 아이콘 */}
                <svg
                    className="w-6 h-6 animate__animated animate__swing"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>

            </button>
            <Link to={routes.Home.path}><h1 className="text-lg font-bold">{title}</h1></Link>

        </header>
    )
}