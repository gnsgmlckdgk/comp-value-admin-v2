import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';

export default function Home() {

    const [hello, setHello] = useState("Hello World!!");
    const didAlert = useRef(false);

    const { isLoggedIn, setIsLoggedIn } = useAuth(); // 로그인 상태 변경 함수
    const [username, setUserName] = useState('');
    const [password, setPassWord] = useState('');

    useEffect(() => {
        if (!isLoggedIn && !didAlert.current) {
            didAlert.current = true;
            alert("로그인이 필요합니다.");
        }
    }, [])

    return (
        <>
            <div>{hello}</div>
        </>
    );

}
