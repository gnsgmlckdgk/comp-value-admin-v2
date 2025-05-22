import Input from '@/component/common/input/Input';

/**
 * 텍스트 입력 행 리스트 컴포넌트
 * @param {Array} rows - [labelNode, value, setter] 형태의 배열
 */
const InputRowList_Text = ({ rows }) => {
    return (
        <div className="space-y-4">
            {rows.map(([labelNode, value, setter], idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-center gap-2">
                    <div className="w-full md:w-1/5 font-medium flex items-center">
                        {labelNode}
                    </div>
                    <div className="w-full md:w-2/5">
                        <Input
                            className="w-full"
                            inputMode="text"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-2/5 text-right font-semibold truncate">
                        {value}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default InputRowList_Text;