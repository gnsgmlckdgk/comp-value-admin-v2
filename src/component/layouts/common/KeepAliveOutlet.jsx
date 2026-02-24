import { useRef } from 'react';
import { useOutlet, useLocation } from 'react-router-dom';
import { useTab, TabActiveContext } from '@/context/TabContext';

/**
 * Outlet 대체 컴포넌트: 모든 열린 탭의 컴포넌트를 동시에 렌더링하되
 * 비활성 탭은 display:none으로 숨겨 컴포넌트 상태(state)를 보존한다.
 */
export default function KeepAliveOutlet() {
    const { tabs, activeKey } = useTab();
    const outlet = useOutlet();
    const location = useLocation();
    const cacheRef = useRef(new Map());

    // 현재 경로의 outlet을 캐시에 저장
    const pathname = location.pathname;
    if (outlet) {
        cacheRef.current.set(pathname, outlet);
    }

    // 탭 목록에 없는 캐시 항목 제거 (탭 닫기 시 메모리 정리)
    for (const key of cacheRef.current.keys()) {
        if (!tabs.some(t => t.key === key)) {
            cacheRef.current.delete(key);
        }
    }

    return (
        <>
            {tabs.map(tab => {
                const isActive = tab.key === activeKey;

                // 활성 탭 + URL 일치: fresh outlet 사용 (최신 route context)
                // 그 외: 캐시된 element 사용 (상태 보존)
                const element = (isActive && tab.key === pathname)
                    ? outlet
                    : cacheRef.current.get(tab.key);

                if (!element) return null;

                return (
                    <div key={tab.key} style={{ display: isActive ? 'block' : 'none' }}>
                        <TabActiveContext.Provider value={isActive}>
                            {element}
                        </TabActiveContext.Provider>
                    </div>
                );
            })}
        </>
    );
}
