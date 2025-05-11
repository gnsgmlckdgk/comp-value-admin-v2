import { Outlet } from 'react-router-dom';



function FreeBoard() {

    return (
        <>
            <h1 className='md:text-3xl text-xl mb-5'>자유게시판</h1>
            <Outlet></Outlet>
        </>
    )
}

export default FreeBoard