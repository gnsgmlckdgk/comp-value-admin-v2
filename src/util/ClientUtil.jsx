import axios from 'axios';

axios.defaults.withCredentials = true;

// 현재 환경 감지
const isDev = import.meta.env.DEV // vite에서는 import.meta.env.DEV로 감지
const baseURL = isDev ? '' : '' // 개발환경은 proxy 타니까 '', 운영도 상대경로 ''

/**
 * Url에 도메인 세팅
 * 개발은 localhost:port (vite.config.js) / 운영은 상대경로
 * @param {string} url 
 * @returns 
 */
const getUrl = (url) => {
    return baseURL + url;
}

/**
 * 에러 응답 처리
 * @param {any} error 
 * @returns {{ data: null, error: string }}
 */
/**
 * 강제 로그아웃 브로드캐스트 (401 등 세션 만료 시)
 */
const forceClientLogout = () => {
    try {
        localStorage.setItem('isLoggedIn', 'false');
        // localStorage.removeItem('userRole');
        // localStorage.removeItem('userName');
        localStorage.removeItem('nickName');
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: '401' } }));
    } catch (e) { /* noop */ }
};

const handleError = (error) => {
    if (error.response) {
        const { status, data } = error.response;
        const message = data.message;

        if (status === 401) {
            // 세션 만료/인증 실패 → 클라이언트 강제 로그아웃 상태로 전환
            forceClientLogout();
            return { data: null, error: message || '인증 실패' };
        }

        if (status === 400) {
            return { data: null, error: message || '잘못된 요청' };
        }

        return { data: null, error: message || '서버 에러' };
    }
    return { data: null, error: '네트워크 에러' };
};

/**
 * 동기 통신 (async/await 방식)
 * 호출하는 쪽에서 동기로 받고 싶으면 await send(...)
 * 호출하는 쪽에서 비동기 방식으로 호출하고 콜백을 받고 싶으면 .then 으로 받아서 처리 (Promise 체인)
 * 
 * @param {string} url 
 * @param {object} params 예: { corp_name: string, corp_code: string, year: string }
 * @param {string} [method="GET"] 
 * @returns {Promise<{ data: any, error: string|null }>}
 */
export const send = async (url, params, method = "GET") => {

    url = getUrl(url);

    try {
        let response;
        if (method === "POST") {
            response = await axios.post(url, params, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
            });
        } else if (method === "PUT") {
            response = await axios.put(url, params, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
            });
        } else if (method === "DELETE") {
            response = await axios.delete(url, { params, withCredentials: true });
        } else {
            response = await axios.get(url, { params, withCredentials: true });
        }
        return { data: response.data, error: null };
    } catch (error) {
        return handleError(error);
    }
};

/**
 * 비동기 통신 (Promise 체인 방식)
 * @param {string} url 
 * @param {object} params 
 * @param {string} [method="GET"] 
 * @returns {Promise<{ data: any, error: string|null }>}
 */
export const asyncSend = (url, params, method = "GET") => {

    url = getUrl(url);

    const request = method === "POST"
        ? axios.post(url, params, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
        })
        : axios.get(url, { params, withCredentials: true });

    return request
        .then(response => ({ data: response.data, error: null }))
        .catch(handleError);
};