/**
 * 검색 구분용 select 컴포넌트
 *
 * @component
 * @param {string} value - 현재 선택된 값
 * @param {function} onChange - 값 변경 핸들러
 * @param {Array<{ name: string, value: string }>} options - 옵션 목록
 *
 * @example
 * <Select001
 *   value={selected}
 *   onChange={(e) => setSelected(e.target.value)}
 *   options={[{ name: '전체', value: 'all' }, { name: '제목', value: 'title' }]}
 * />
 */
function Select001({ value, onChange, options }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className="md:basis-[15%] h-10 px-3 text-sm border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
        >
            {options.map((option, idx) => (
                <option key={idx} value={option.value}>
                    {option.name}
                </option>
            ))}
        </select>
    );
}

export default Select001;