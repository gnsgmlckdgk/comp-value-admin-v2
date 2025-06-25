import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext';
import Input from '@/component/common/input/Input';
import Button from '@/component/common/button/Button';

export default function Home() {

    const [hello, setHello] = useState("Hello World!!");

    return (
        <>
            <div>{hello}</div>
        </>
    );
}
