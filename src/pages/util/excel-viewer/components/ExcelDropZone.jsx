import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

const ACCEPTED_TYPES = '.xlsx,.xls,.csv';

export default function ExcelDropZone({ onFile }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleChange = (e) => {
        const file = e.target.files[0];
        if (file) onFile(file);
        e.target.value = '';
    };

    return (
        <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 cursor-pointer transition-colors ${
                isDragOver
                    ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-900/20'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-slate-500'
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleChange}
                className="hidden"
            />
            <div className={`rounded-full p-4 ${
                isDragOver
                    ? 'bg-sky-100 dark:bg-sky-800/40'
                    : 'bg-slate-100 dark:bg-slate-700'
            }`}>
                {isDragOver
                    ? <Upload className="h-8 w-8 text-sky-500 dark:text-sky-400" />
                    : <FileSpreadsheet className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                }
            </div>
            <div className="text-center">
                <p className="text-base font-medium text-slate-700 dark:text-slate-200">
                    파일을 드래그하여 놓거나 클릭하여 선택하세요
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    .xlsx, .xls, .csv 파일 지원
                </p>
            </div>
        </div>
    );
}
