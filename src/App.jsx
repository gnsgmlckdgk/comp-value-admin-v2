import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'

import Header from '@/component/Header'
import Side from '@/component/Side'

import routes from '@/config/routes'
import '@/App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className='flex flex-col min-h-screen w-screen'>
        {/* 헤더 */}
        <Header />

        {/* 헤더 밑 전체를 flex */}
        <div className="flex flex-1 w-full">

          {/* 사이드바 */}
          <Side />

          {/* 메인 컨텐츠 */}
          <main className='flex-1 bg-gray-100 p-6'>
            <Routes>
              {Object.entries(routes).map(([key, route]) => (
                <Route key={key} path={route.path} element={route.element} />
              ))}
            </Routes>
          </main>
        </div>
      </div>
    </>
  )
}

export default App
