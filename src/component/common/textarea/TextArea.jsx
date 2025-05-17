
function TextArea({ id, label = '', placeholder = '', className = '', value = '', onChange = {}, labelNewLine = false, disabled = false, wdfull = false, rows = 6 }) {

    const baseClassName = 'border border-gray-300 rounded-md shadow-sm px-3 py-2';

    return (
        <>
            <label htmlFor={id} className={`${labelNewLine ? 'block' : 'mr-2'} mb-1 text-sm text-gray-700`}>{label}</label>
            <textarea id={id} placeholder={placeholder}
                rows={rows}
                className={`${baseClassName} ${className} ${disabled ? 'cursor-not-allowed bg-gray-100' : ''} ${wdfull ? 'w-full' : ''}`}
                value={value}
                onChange={onChange}
                disabled={disabled}
            />
        </>
    )
}

export default TextArea;