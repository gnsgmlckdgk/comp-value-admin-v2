import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * 말줄임(truncate)된 텍스트를 탭/클릭하면 전체 내용을 툴팁으로 표시.
 * portal로 렌더링하므로 부모 overflow-hidden에 영향받지 않음.
 */
export default function TruncatedText({ children, className = '', as: Tag = 'span' }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const ref = useRef(null);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        const el = ref.current;
        if (!el || el.scrollWidth <= el.clientWidth) return;
        const rect = el.getBoundingClientRect();
        setPos({
            top: rect.bottom + 4,
            left: Math.min(rect.left, window.innerWidth - 200),
        });
        setOpen(v => !v);
    }, []);

    useEffect(() => {
        if (!open) return;
        const id = setTimeout(() => setOpen(false), 2500);
        const close = () => setOpen(false);
        window.addEventListener('scroll', close, { passive: true, capture: true });
        return () => {
            clearTimeout(id);
            window.removeEventListener('scroll', close, { capture: true });
        };
    }, [open]);

    const tooltip = open && createPortal(
        <span
            className="fixed z-[9999] max-w-[min(90vw,20rem)] break-all
                bg-slate-800 dark:bg-slate-600 text-white text-[11px] leading-snug
                rounded px-2 py-1 shadow-lg whitespace-normal pointer-events-none"
            style={{ top: pos.top, left: Math.max(8, pos.left) }}
        >
            {children}
        </span>,
        document.body,
    );

    return (
        <Tag
            ref={ref}
            className={`truncate ${className}`}
            title={typeof children === 'string' ? children : undefined}
            onClick={handleClick}
        >
            {children}
            {tooltip}
        </Tag>
    );
}
