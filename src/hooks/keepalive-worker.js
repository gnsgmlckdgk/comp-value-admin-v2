const INTERVAL = 3 * 60 * 1000;
let timer = null;

self.onmessage = (e) => {
    const { type, url } = e.data;
    if (type === 'start') {
        if (timer) clearInterval(timer);
        ping(url);
        timer = setInterval(() => ping(url), INTERVAL);
    } else if (type === 'stop') {
        if (timer) { clearInterval(timer); timer = null; }
    }
};

async function ping(url) {
    try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        const data = await res.json();
        self.postMessage({
            type: 'pong',
            status: res.status,
            sessionTTL: data?.response?.sessionTTL
        });
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
}
