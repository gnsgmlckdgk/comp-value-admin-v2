import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import routes from '@/config/routes'
import { send } from '@/util/ClientUtil';
import { useAuth } from '@/context/AuthContext';

import LoginModal from '@/component/layouts/common/popup/LoginModal';


export default function Header001({ onMenuClick }) {

    const [title, setTitle] = useState('CompValue');
    const [showLogin, setShowLogin] = useState(false);

    const { isLoggedIn, setIsLoggedIn } = useAuth();
    const [username, setUserName] = useState('');
    const [password, setPassWord] = useState('');
    const [nickName, setNickName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();


    const login = async () => {
        const sendUrl = `/dart/member/login`;

        setIsLoading(true);

        const { data, error } = await send(sendUrl, {
            username: username,
            password: password
        }, "POST");

        setIsLoading(false);

        if (error == null) {
            const sessionKey = data.response ? data.response.sessionKey : null;
            if (sessionKey == null) alert("인증 실패");
            else {
                setUserName('');
                setPassWord('');
                setNickName(data.response.nickName);
                setShowLogin(false);
                setIsLoggedIn(true);
            }

        } else {
            alert(error);
        }
    }

    const logout = async () => {
        const sendUrl = `/dart/member/logout`;

        setIsLoading(true);

        const { data, error } = await send(sendUrl, {}, "DELETE");
        if (error == null) {
            alert('로그아웃 되었습니다.');
            setIsLoggedIn(false);

            navigate(`/`);
        }
        else alert(error);

        setIsLoading(false);
    }


    return (
        <>
            <header className="h-16 bg-sky-600 text-white flex items-center px-4 shadow-md">
                <button
                    className='md:hidden text-gray-200 focus:outline-none pr-3'
                    onClick={onMenuClick}>

                    {/* 햄버거 아이콘 */}
                    <svg
                        className="w-6 h-6 animate__animated animate__swing"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>

                </button>
                <Link to={routes.Home.path}><h1 className="text-lg font-bold">{title}</h1></Link>

                {isLoggedIn ? (
                    <div className="ml-auto flex items-center space-x-4 text-sm">
                        <span>{nickName}</span>
                        <span className="cursor-pointer underline" onClick={logout}>로그아웃</span>
                    </div>
                ) : (
                    <div className="ml-auto text-sm cursor-pointer" onClick={() => setShowLogin(true)}>로그인</div>
                )}

            </header>

            {showLogin && (
                <LoginModal
                    show={showLogin}
                    onClose={() => setShowLogin(false)}
                    onLogin={login}
                    isLoading={isLoading}
                    username={username}
                    setUsername={setUserName}
                    password={password}
                    setPassword={setPassWord}
                />
            )}
        </>
    )
}