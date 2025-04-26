import { useState } from 'react'

export default function Home() {

    const [hello, setHello] = useState("Hello World!!");

    return (
        <>
            <h1 className='animate__animated animate__bounceInUp'>{hello}</h1>
        </>
    )

}
