import { useState } from 'react';

const ToggleSection = ({ title = '상세', children }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="mt-4">
            <button
                className="w-full text-left px-4 py-2 font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition"
                onClick={() => setOpen(!open)}
            >
                {title} {open ? '▲' : '▼'}
            </button>
            {open && (
                <div className="mt-2 px-4 py-3 border border-t-0 border-gray-300 rounded-b bg-white text-sm">
                    {children}
                </div>
            )}
        </div>
    );
};

export default ToggleSection;