


const SimpleList = ({ rows = [] }) => {

    return (
        <>
            <ul className="space-y-2 text-sm dark:text-slate-300">
                {rows.map((row, idx) => (
                    <li key={idx}>
                        {row[0]}: {row[1]}
                    </li>
                ))}
            </ul>
        </>
    )
}

export default SimpleList;