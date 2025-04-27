import { useState } from 'react';
import { Routes, Route } from 'react-router-dom'

import Header from '@/component/Header'
import SideBar from '@/component/SideBar'

import routes from '@/config/routes'
import '@/App.css'

function App() {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (

    <div className='flex flex-col min-h-screen'>
      {/* 헤더 */}
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* 본문 영역 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 사이드바 */}
        <SideBar isSidebarOpen={isSidebarOpen} />

        {/* 메인 컨텐츠 */}
        <main className='flex-1 bg-white p-6 overflow-auto'>
          <Routes>
            {Object.entries(routes).map(([key, route]) => (
              <Route key={key} path={route.path} element={route.element} />
            ))}
          </Routes>
        </main>
      </div>
    </div>

  )
}

export default App
