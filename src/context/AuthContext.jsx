// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react';

// 1. Context 생성
// 전역에서 로그인 상태를 공유하기 위해 AuthContext를 만듬
const AuthContext = createContext();

// 2. Provider 컴포넌트 정의
// 이 컴포넌트로 감싼 하위 컴포넌트들은 로그인 상태에 접근 가능
export function AuthProvider({ children }) {
    // 로그인 상태를 관리하는 state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [nickName, setNickName] = useState('');
    const [roles, setRoles] = useState([]);

    return (
        // value 객체로 로그인 상태와 변경 함수 전달
        <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, userName, setUserName, nickName, setNickName, roles, setRoles }}>
            {children}
        </AuthContext.Provider>
    );
}

// 3. Custom Hook: useAuth
// useContext로 AuthContext에 접근하는 로직을 함수로 래핑
// 컴포넌트에서 import해서 간단히 로그인 상태를 가져올 수 있게 함
export function useAuth() {
    return useContext(AuthContext);
}