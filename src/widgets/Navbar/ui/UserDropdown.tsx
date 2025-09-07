'use client';

import React, {FC, useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Session} from 'next-auth';
import LogoutButton from './LogoutButton';

interface UserDropdownProps {
    session: Session;
    className?: string;
}

const UserDropdown: FC<UserDropdownProps> = ({session, className = ''}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className={`${className} flex items-center gap-2 focus:outline-none`}
            >
                {session.user?.image && (
                    <Image
                        className="rounded-xl"
                        src={session.user.image}
                        alt="User Avatar"
                        width={32}
                        height={32}
                    />
                )}
                {session.user?.name && (
                    <span className="text-white-800">{session.user.name}</span>
                )}
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        Профиль
                    </Link>
                    <div className="border-t border-gray-100">
                        <div className="px-4 py-2 hover:bg-gray-100 transition-colors">
                            <LogoutButton
                                className="text-sm text-gray-700 hover:text-red-600 transition-colors bg-transparent border-none cursor-pointer p-0"/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;