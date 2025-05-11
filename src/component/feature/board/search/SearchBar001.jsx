import Button from '@/component/common/button/Button';
import Input from '@/component/common/input/Input';

/**
 * 검색어 입력과 조회 버튼을 제공하는 검색 바 컴포넌트입니다.
 * 입력 + 조회
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
function SearchBar001({ fetchData, label = '', searchState }) {

    const { search, setSearch } = searchState;

    const inputProps = {
        id: 'search',
        label,
        placeholder: '검색어 입력',
        value: search,
        onEnter: fetchData,
        onChange: (e) => setSearch(e.target.value),
        className: 'md:basis-[90%]'
    }

    return (
        <div className='flex flex-col md:flex-row gap-1 p-3'>
            <Input {...inputProps} />
            <Button children='조회하기' onClick={fetchData} variant='select' className='md:basis-[10%]' />
        </div>
    )
}

export default SearchBar001