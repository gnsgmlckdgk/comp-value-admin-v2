
/**
 * 사용자 입력을 받는 텍스트 입력 컴포넌트입니다.
 *
 * @component
 * @param {Object} props - 컴포넌트 속성
 * @param {string} props.id - input 요소의 고유 식별자
 * @param {string} [props.label=''] - input에 연결된 라벨 텍스트
 * @param {string} [props.placeholder=''] - 입력 필드의 플레이스홀더 텍스트
 * @param {string} [props.className=''] - 추가적인 CSS 클래스
 * @param {string} [props.value=''] - 입력 필드의 값
 * @param {function} [props.onEnter] - Enter 키 입력 시 호출되는 함수
 * @param {function} [props.onChange] - 입력 값 변경 시 호출되는 함수
 * @returns {JSX.Element} 렌더링된 입력 필드 요소
 *
 * @example
 * // 기본 사용 예시
 * <Input
 *   id="username"
 *   label="사용자 이름"
 *   placeholder="이름을 입력하세요"
 *   value={username}
 *   onChange={(e) => setUsername(e.target.value)}
 *   onEnter={() => handleSubmit()}
 * />
 */
function Input({ id, label = '', placeholder = '', className = '', value = '', onEnter, onChange }) {

    // const baseClassName = 'mr-3 w-48 md:w-128 h-10 border border-gray-300 rounded-md shadow-sm px-3';
    const baseClassName = 'h-10 border border-gray-300 rounded-md shadow-sm px-3';

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 필요시 폼 제출 방지
            onEnter?.();        // onEnter 함수가 전달된 경우 실행
        }
    };

    return (
        <>
            <label htmlFor={id}>{label}</label>
            <input id={id} placeholder={placeholder}
                className={`${baseClassName} ${className}`}
                value={value}
                onKeyDown={handleKeyDown}
                onChange={onChange}
            />
        </>
    )
}

export default Input;