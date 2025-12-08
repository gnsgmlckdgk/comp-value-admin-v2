import { Outlet } from 'react-router-dom';



function FreeBoard() {

    return (
        <>
            <h1 className='text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-white'>자유게시판</h1>
            <Outlet></Outlet>
        </>
    )
}

export default FreeBoard