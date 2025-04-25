import { useState } from 'react'
import { Link } from 'react-router-dom'
import routes from '../config/routes'

export default function Header() {

    const [title, setTitle] = useState('CompValue');

    return (
        <header className="h-16 bg-blue-600 text-white flex items-center px-6 shadow-md">
            <h1 className="text-lg font-bold">{title}</h1>
        </header>
    )
}