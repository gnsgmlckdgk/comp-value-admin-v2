
/**
 * 다양한 스타일과 동작을 지원하는 버튼 컴포넌트입니다.
 *
 * @component
 * @param {Object} props - 컴포넌트 속성
 * @param {React.ReactNode} props.children - 버튼 내부에 표시될 콘텐츠
 * @param {function} [props.onClick] - 버튼 클릭 시 호출되는 함수
 * @param {'button' | 'submit' | 'reset'} [props.type='button'] - 버튼의 타입
 * @param {'primary' | 'danger' | 'outline' | 'select'} [props.variant='primary'] - 버튼의 스타일 변형
 * @param {string} [props.className=''] - 추가적인 CSS 클래스
 * @returns {JSX.Element} 렌더링된 버튼 요소
 *
 * @example
 * // 기본 버튼
 * <Button onClick={() => alert('클릭됨')}>클릭</Button>
 *
 * @example
 * // 위험 스타일의 버튼
 * <Button variant="danger">삭제</Button>
 */
function Button({ children, onClick, type = 'button', variant = 'primary', className = '' }) {

    const baseStyle = 'px-5 py-2.5 rounded-lg shadow-md font-semibold transition-all duration-300 text-sm'

    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-gray-400 text-gray-700 bg-white hover:bg-gray-100',

        select: 'border border-amber-600 text-amber-600 hover:bg-amber-100 hover:shadow-lg transition-all duration-300 cursor-pointer'
    }

    return (
        <button
            type={type}
            onClick={typeof onClick === 'function' ? onClick : undefined}
            className={`${baseStyle} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    )
}

export default Button