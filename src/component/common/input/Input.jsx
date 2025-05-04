import { useState, useEffect } from 'react';


function Input({ id, label = '', placeholder = '', className = '', onEnter }) {

    const baseClassName = 'mr-3 w-48 md:w-128 h-10 border border-gray-300 rounded-md shadow-sm px-3';

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 필요시 폼 제출 방지
            onEnter?.();        // onEnter 함수가 전달된 경우 실행
        }
    };

    return (
        <>
            <label htmlFor={id}>{label}</label>
            <input id={id} placeholder={placeholder}
                className={`${baseClassName} ${className}`} onKeyDown={handleKeyDown} />
        </>
    )
}

export default Input;