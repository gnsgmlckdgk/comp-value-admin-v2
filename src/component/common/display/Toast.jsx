import { useState, useEffect } from 'react';
import useModalAnimation from '@/hooks/useModalAnimation';

export default function Toast({ message }) {
    const show = !!message;
    const [lastMessage, setLastMessage] = useState(message);
    const { shouldRender, isAnimatingOut } = useModalAnimation(show, 300);

    useEffect(() => {
        if (message) setLastMessage(message);
    }, [message]);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 animate__animated ${isAnimatingOut ? 'animate__fadeOutDown' : 'animate__fadeInUp'}`}
            style={{ animationDuration: '0.3s' }}
        >
            <div className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
                <p className="text-sm whitespace-pre-line">{lastMessage}</p>
            </div>
        </div>
    );
}
