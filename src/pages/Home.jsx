import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/component/common/button/Button';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const navigate = useNavigate();
    const { isLoggedIn, userName, userRole } = useAuth();

    useEffect(() => {
        // 페이지 타이틀 가볍게 세팅
        document.title = isLoggedIn ? '대시보드 | CompValue' : 'CompValue — 기업가치 분석';
    }, [isLoggedIn]);

    if (!isLoggedIn) {
        // 🔓 비로그인 랜딩 화면
        return (
            <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-3xl font-bold mb-3">📊 CompValue — 기업가치 분석 플랫폼</h1>
                <p className="text-slate-600 mb-8 max-w-[680px]">
                    주식의 내재가치를 정량적으로 평가하고, 기업의 성장성과 밸류에이션을 시각적으로 비교해보세요.
                </p>

                <div className="flex items-center gap-3">
                    <Button
                        text="로그인하고 시작하기"
                        onClick={() => {
                            // 헤더 로그인 모달을 띄우고 싶다면 전역 이벤트로 요청
                            try { window.dispatchEvent(new CustomEvent('ui:openLogin')); } catch { }
                        }}
                    />
                    <button
                        type="button"
                        className="text-sm text-slate-600 underline"
                        onClick={() => navigate('/compvalue/abroad')}
                    >
                        먼저 화면만 둘러보기
                    </button>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
                    <LandingCard
                        title="국내기업 조회"
                        desc="국내 등록된 기업 목록을 조회"
                    />
                    <LandingCard
                        title="기업가치 계산(국내)"
                        desc="종목별 밸류에이션, 성장률, PEG 비율 등을 조회"
                    />
                    <LandingCard
                        title="기업가치 계산(미국)"
                        desc="종목별 밸류에이션, 성장률, PEG 비율 등을 조회"
                    />
                </div>
            </div>
        );
    }

    // 🔐 로그인 후 대시보드
    return (
        <div className="p-6 md:p-8">
            <h1 className="text-2xl font-bold mb-2">
                {localStorage.getItem("nickName") ? `${localStorage.getItem("userName")}님, 환영합니다 👋` : '환영합니다 👋'}
            </h1>
            <p className="text-slate-600 mb-6">
                {localStorage.getItem("role") ? `현재 권한: ${localStorage.getItem("role")}` : '오늘도 좋은 분석 되세요!'}
            </p>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <DashCard
                    emoji="🧮"
                    title="국내기업 조회"
                    desc="국내 등록된 기업 목록을 조회"
                    cta="기업 조회"
                    onClick={() => navigate('/complist')}
                />
                <DashCard
                    emoji="📈"
                    title="기업가치 계산(국내)"
                    desc="종목별 밸류에이션, PEG 비율 등을 조회"
                    cta="가치 분석"
                    onClick={() => navigate('/compvalue')}
                />
                <DashCard
                    emoji="🧾"
                    title="기업가치 계산(미국)"
                    desc="종목별 밸류에이션, 성장률, PEG 비율 등을 조회"
                    cta="가치 분석"
                    onClick={() => navigate('/compvalue/abroad')}
                />
            </div>
        </div>
    );
}

function LandingCard({ title, desc, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="text-left rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition w-full"
        >
            <div className="text-lg font-semibold mb-1">{title}</div>
            <div className="text-sm text-slate-600">{desc}</div>
        </button>
    );
}

function DashCard({ emoji, title, desc, cta, onClick }) {
    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="text-2xl mb-2">{emoji}</div>
            <div className="text-lg font-semibold mb-1">{title}</div>
            <div className="text-sm text-slate-600 mb-3">{desc}</div>
            <Button text={cta} onClick={onClick} />
        </div>
    );
}
