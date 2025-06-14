import { useEffect, useRef } from 'react'

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

    // show가 false일 경우 아무것도 렌더링하지 않음
    if (!show) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>

            {/* 로딩 중일 때 보여주는 컴포넌트 */}
            <Loading show={isLoading} />

            <div className="bg-white p-4 md:p-6 rounded shadow-md text-black w-[90%] max-w-md">
                <h2 className="text-lg font-bold mb-4">로그인</h2>
                {/* 아이디 입력창 */}
                <Input inputRef={usernameRef} label='아이디' type='text' value={username} onChange={e => setUsername(e.target.value)} onEnter={{}} wdfull={true} />
                {/* 비밀번호 입력창 */}
                <Input label='비밀번호' type='password' value={password} onChange={e => setPassword(e.target.value)} onEnter={onLogin} wdfull={true} />

                <div className="flex justify-between items-center mt-4">
                    {/* 닫기 버튼 */}
                    <Button children='닫기' variant='close' onClick={onClose} />
                    <div className="flex space-x-2">
                        {/* 로그인 버튼 */}
                        <Button children='로그인' onClick={onLogin} />
                    </div>
                </div>
            </div>

        </div>
    );
}