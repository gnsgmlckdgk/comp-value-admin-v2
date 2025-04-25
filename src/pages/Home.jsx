import { useState } from 'react'



export default function Home() {

    const [hello, setHello] = useState("Hello World!!");

    return (
        <>
            <h1>{hello}</h1>
        </>
    )

}
