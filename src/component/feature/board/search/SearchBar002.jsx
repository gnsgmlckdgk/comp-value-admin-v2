import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';
import Select from '@/component/common/select/Select001';

/**
 * 검색어 입력과 조회 버튼을 제공하는 검색 바 컴포넌트입니다.
 * 검색구분 + 입력 + 조회
 *
 * @component
 * @param {Object} props - 컴포넌트 속성
 * @param {Function} props.fetchData - 조회 버튼 클릭 또는 Enter 키 입력 시 호출되는 함수
 * @param {string} [props.label=''] - 입력 필드에 표시될 라벨 텍스트
 * @param {Object} props.searchState - 검색어 상태를 포함하는 객체
 * @param {string} props.searchState.search - 현재 검색어 문자열
 * @param {Function} props.searchState.setSearch - 검색어 상태를 업데이트하는 함수
 * @returns {JSX.Element} 렌더링된 검색 바 컴포넌트
 *
 * @example
 * const [search, setSearch] = useState('');
 * const fetchData = () => { ... };
 *
 * <SearchBar fetchData={fetchData} label="검색어" searchState={{ search, setSearch }} />
 */
function SearchBar002({ fetchData, label = '', searchState }) {

    const inputProps = {
        id: 'search',
        label,
        placeholder: '검색어를 입력하세요',
        value: searchState.search,
        onEnter: fetchData,
        onChange: (e) => searchState.setSearch(e.target.value),
        wdfull: true
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            {/* 검색 구분 선택 */}
            <div className="w-full sm:w-auto sm:min-w-[140px]">
                <Select
                    value={searchState.sgubun}
                    onChange={e => searchState.setSgubun(e.target.value)}
                    options={searchState.searchGubunList}
                    className="w-full"
                />
            </div>

            {/* 검색어 입력 + 조회 버튼 */}
            <div className="flex gap-3 flex-1 min-w-0 items-center">
                <div className="flex-1 min-w-0">
                    <Input {...inputProps} />
                </div>
                <Button
                    children="조회"
                    onClick={() => fetchData()}
                    variant="select"
                    className="w-20 sm:w-24 h-10 shrink-0 !py-0 flex items-center justify-center"
                />
            </div>
        </div>
    )
}

export default SearchBar002