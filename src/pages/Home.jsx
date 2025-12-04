import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/component/common/button/Button';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isLoggedIn, userName } = useAuth();

    useEffect(() => {
        // 페이지 타이틀 가볍게 세팅
        document.title = isLoggedIn ? '대시보드 | CompValue' : 'CompValue — 기업가치 분석';
    }, [isLoggedIn]);

    const reason = location.state?.reason;

    if (!isLoggedIn) {
        // 🔓 비로그인 랜딩 화면
        return (
            <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-6">
                {reason === 'logout' && (
                    <div className="mb-6 w-full max-w-xl rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 shadow-sm">
                        안전하게 로그아웃되었습니다. 다시 이용하시려면 상단의 로그인 버튼을 눌러주세요.
                    </div>
                )}
                {reason === '401' && (
                    <div className="mb-6 w-full max-w-xl rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 shadow-sm">
                        인증 정보가 만료되었습니다. 보안을 위해 자동으로 로그아웃되었어요. 다시 로그인해 주세요.
                    </div>
                )}
                <h1 className="text-3xl font-bold mb-3">📊 CompValue — 기업가치 분석 플랫폼</h1>
                <p className="text-slate-600 mb-8 max-w-[680px]">
                    주식의 내재가치를 정량적으로 평가하고, 기업의 성장성과 밸류에이션을 시각적으로 비교해보세요.
                </p>
            </div>
        );
    }

    // 🔐 로그인 후 환영 페이지
    return (
        <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center px-6">
            <div className="mb-8">
                <div className="text-6xl mb-4">📊</div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-800">
                    {localStorage.getItem("nickName") || localStorage.getItem("userName") || '환영합니다'}님, 반갑습니다
                </h1>
                <p className="text-slate-600 text-lg mb-2">
                    {new Date().toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                    })}
                </p>
                <p className="text-slate-500">
                    오늘도 좋은 투자 분석이 되시길 바랍니다
                </p>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-5xl w-full">
                <MenuCard
                    emoji="💼"
                    title="보유종목(미국)"
                    desc="내 포트폴리오를 관리하고 수익률을 확인하세요"
                    onClick={() => navigate('/transaction/overview')}
                />
                <MenuCard
                    emoji="🧮"
                    title="국내기업 조회"
                    desc="국내 등록된 기업 목록을 조회"
                    onClick={() => navigate('/complist')}
                />
                <MenuCard
                    emoji="📈"
                    title="기업가치(국내)"
                    desc="국내 종목의 밸류에이션 분석"
                    onClick={() => navigate('/compvalue')}
                />
                <MenuCard
                    emoji="🌎"
                    title="기업가치(미국)"
                    desc="미국 종목의 밸류에이션 분석"
                    onClick={() => navigate('/compvalue/abroad')}
                />
            </div>

            <div className="mt-12 max-w-3xl">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                    <h2 className="text-lg font-semibold mb-2 text-slate-800">CompValue 소개</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        주식의 내재가치를 정량적으로 평가하고, 기업의 성장성과 밸류에이션을 시각적으로 비교하는 플랫폼입니다.
                        PER, PEG, ROE 등 다양한 지표를 활용하여 합리적인 투자 의사결정을 지원합니다.
                    </p>
                </div>
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

function MenuCard({ emoji, title, desc, onClick }) {
    return (
        <button
            onClick={onClick}
            className="text-center rounded-lg border bg-white p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
        >
            <div className="text-4xl mb-3">{emoji}</div>
            <div className="text-lg font-semibold mb-2 text-slate-800">{title}</div>
            <div className="text-sm text-slate-600 leading-snug">{desc}</div>
        </button>
    );
}
