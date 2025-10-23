import { useEffect, useRef, useState } from 'react'

import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';
import Loading from '@/component/common/display/Loading';

export default function LoginModal({
    show,
    onClose,
    onLogin,
    isLoading,
    username,
    setUsername,
    password,
    setPassword,
}) {

    const usernameRef = useRef(null);

    useEffect(() => {
        if (show && usernameRef.current) {
            usernameRef.current.focus();
        }
    }, [show]);

    const [keyboardOffset, setKeyboardOffset] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            const visualViewport = window.visualViewport;
            if (visualViewport) {
                const offset = window.innerHeight - visualViewport.height;
                setKeyboardOffset(offset > 0 ? offset : 0);
            }
        };
        window.visualViewport?.addEventListener('resize', handleResize);
        return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }, []);

    // show가 false일 경우 아무것도 렌더링하지 않음
    if (!show) return null;

    const handleOutsideClick = (e) => {
        if (e.target.classList.contains('login-modal-overlay')) {
            onClose();
        }
    };

    return (
        <div
            className="login-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={handleOutsideClick}
        >
            <Loading show={isLoading} />
            <div
                className="relative bg-white p-4 md:p-6 rounded shadow-md text-black w-full max-w-md transition-transform duration-200 ease-out"
                style={{ transform: `translateY(-${keyboardOffset}px)` }}
            >
                <h2 className="text-lg font-bold mb-4">로그인</h2>
                <Input
                    inputRef={usernameRef}
                    label='아이디'
                    type='text'
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onEnter={onLogin}
                    wdfull={true}
                />
                <Input
                    label='비밀번호'
                    type='password'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onEnter={onLogin}
                    wdfull={true}
                />

                <div className="flex justify-between items-center mt-4">
                    <Button children='닫기' variant='close' onClick={onClose} />
                    <div className="flex space-x-2">
                        <Button children='로그인' onClick={onLogin} />
                    </div>
                </div>
            </div>
        </div>
    );
}