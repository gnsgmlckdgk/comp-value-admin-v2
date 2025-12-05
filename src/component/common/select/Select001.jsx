/**
 * 검색 구분용 select 컴포넌트
 *
 * @component
 * @param {string} value - 현재 선택된 값
 * @param {function} onChange - 값 변경 핸들러
 * @param {Array<{ name: string, value: string }>} options - 옵션 목록
 * @param {string} className - 추가 CSS 클래스
 *
 * @example
 * <Select001
 *   value={selected}
 *   onChange={(e) => setSelected(e.target.value)}
 *   options={[{ name: '전체', value: 'all' }, { name: '제목', value: 'title' }]}
 * />
 */
function Select001({ value, onChange, options, className = '' }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className={`h-10 px-3 text-sm border border-slate-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 transition-colors hover:border-slate-400 ${className}`}
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