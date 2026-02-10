import useModalAnimation from '@/hooks/useModalAnimation';

const Loading = ({ show }) => {
    const { shouldRender, isAnimatingOut } = useModalAnimation(show, 200);
    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center animate__animated ${isAnimatingOut ? 'animate__fadeOut' : 'animate__fadeIn'}`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', animationDuration: '0.2s' }}
        >
            <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );
};

export default Loading;
