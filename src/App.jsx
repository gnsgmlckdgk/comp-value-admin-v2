import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import '@/App.css'

import Layout from '@/component/layouts/Layout001'
import routes from '@/config/routes'


function App() {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function renderRoutes(routes) {
    return Object.entries(routes).map(([key, route]) => (
      <Route key={key} path={route.path} element={route.element}>
        {route.children && renderRoutesFromArray(route.children)}
      </Route>
    ));
  }

  function renderRoutesFromArray(children) {
    return children.map((child, idx) => (
      <Route key={idx} path={child.path} element={child.element}>
        {child.children && renderRoutesFromArray(child.children)}
      </Route>
    ));
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {renderRoutes(routes)}
      </Route>
    </Routes>
  )
}

export default App
