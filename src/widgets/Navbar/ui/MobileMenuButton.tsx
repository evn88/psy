'use client';

import React, {FC} from 'react';

interface MobileMenuButtonProps {
    isOpen: boolean;
    onClick: () => void;
    className?: string;
}

const MobileMenuButton: FC<MobileMenuButtonProps> = ({
                                                         isOpen,
                                                         onClick,
                                                         className = ''
                                                     }) => {
    return (
        <button
            onClick={onClick}
            className={`md:hidden p-2 rounded-md text-white-800 hover:text-blue-300 hover:bg-gray-600 transition-colors duration-300 ${className}`}
            aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={isOpen}
        >
            <svg
                className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                )}
            </svg>
        </button>
    );
};

export default MobileMenuButton;