const MAX_RESOURCE_HISTORY = 360;

let eventSource = null;
let resourceHistory = [];
let sseUrl = null;

self.onmessage = (e) => {
    const { type, url } = e.data;
    if (type === 'start') {
        sseUrl = url;
        connect(url);
    } else if (type === 'stop') {
        disconnect();
    } else if (type === 'sync') {
        // 탭 복귀 시 전체 히스토리 동기화
        self.postMessage({ type: 'history-sync', resourceHistory });
    }
};

function connect(url) {
    disconnect();
    try {
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
            self.postMessage({ type: 'connected' });
        };

        // snapshot (3초 간격) — resourceHistory 버퍼링
        eventSource.addEventListener('snapshot', (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.resources?.containers?.length > 0) {
                    const entry = { ...data.resources, ts: Date.now() };
                    resourceHistory.push(entry);
                    if (resourceHistory.length > MAX_RESOURCE_HISTORY) {
                        resourceHistory = resourceHistory.slice(
                            resourceHistory.length - MAX_RESOURCE_HISTORY
                        );
                    }
                }

                self.postMessage({ type: 'snapshot', data });
            } catch (err) {
                self.postMessage({ type: 'parse-error', event: 'snapshot', message: err.message });
            }
        });

        // trade
        eventSource.addEventListener('trade', (event) => {
            try {
                self.postMessage({ type: 'trade', data: JSON.parse(event.data) });
            } catch (err) {
                self.postMessage({ type: 'parse-error', event: 'trade', message: err.message });
            }
        });

        // traffic (1초 간격)
        eventSource.addEventListener('traffic', (event) => {
            try {
                self.postMessage({ type: 'traffic', data: JSON.parse(event.data) });
            } catch (err) {
                self.postMessage({ type: 'parse-error', event: 'traffic', message: err.message });
            }
        });

        // api-log (1초 간격)
        eventSource.addEventListener('api-log', (event) => {
            try {
                self.postMessage({ type: 'api-log', data: JSON.parse(event.data) });
            } catch (err) {
                self.postMessage({ type: 'parse-error', event: 'api-log', message: err.message });
            }
        });

        eventSource.onerror = () => {
            self.postMessage({ type: 'disconnected' });
            eventSource.close();
            eventSource = null;
            // 재연결
            setTimeout(() => {
                if (sseUrl) connect(sseUrl);
            }, 3000);
        };
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
}

function disconnect() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    resourceHistory = [];
}
