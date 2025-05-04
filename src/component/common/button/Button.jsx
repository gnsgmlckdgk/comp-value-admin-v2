

function Button({ children, onClick, type = 'button', variant = 'primary', className = '' }) {

    const baseStyle = 'px-5 py-2.5 rounded-lg shadow-md font-semibold transition-all duration-300 text-sm'

    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-gray-400 text-gray-700 bg-white hover:bg-gray-100',

        select: 'border border-amber-600 text-amber-600 hover:bg-amber-100 hover:shadow-lg transition-all duration-300 cursor-pointer'
    }

    return (
        <button
            type={type}
            onClick={typeof onClick === 'function' ? onClick : undefined}
            className={`${baseStyle} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    )
}

export default Button