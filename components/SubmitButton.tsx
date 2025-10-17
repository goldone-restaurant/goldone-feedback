import React from 'react';
import { useI18n } from '@/i18nContext'; // 👈 hook/context i18n bạn đang dùng

interface SubmitButtonProps {
    isLoading: boolean;
    disabled: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ isLoading, disabled }) => {
    const { t } = useI18n(); // 👈 lấy hàm dịch ngôn ngữ hiện tại

    return (
        <button
            type="submit"
            disabled={disabled}
            className="w-full bg-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
            {isLoading ? (
                <>
                    <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    {t('processing')}
                </>
            ) : (
                t('sendFeedback')
            )}
        </button>
    );
};

export default SubmitButton;
