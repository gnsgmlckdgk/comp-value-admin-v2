import { useState } from 'react';
import '@/App.css'

import Layout001 from '@/component/layouts/Layout001'


function App() {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Layout001></Layout001>
  )
}

export default App
