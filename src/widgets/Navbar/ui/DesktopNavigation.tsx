'use client';

import React, {FC} from 'react';
import Link from 'next/link';
import {Session} from 'next-auth';
import LoginButton from './LoginButton';
import UserDropdown from './UserDropdown';

interface DesktopNavigationProps {
    session: Session | null;
}

const NAVBAR_LINK_CLASSES = "text-white-800 hover:text-blue-300 font-medium px-4 py-2 h-[50px] flex items-center rounded-md transition-colors duration-300 hover:bg-gray-600";

const DesktopNavigation: FC<DesktopNavigationProps> = ({session}) => {
    return (
        <nav className="hidden md:flex space-x-8">
            <Link href="/" className={NAVBAR_LINK_CLASSES}>
                Главная
            </Link>
            <Link href="/about" className={NAVBAR_LINK_CLASSES}>
                Обо мне
            </Link>
            {session ? (
                <UserDropdown session={session} className={NAVBAR_LINK_CLASSES}/>
            ) : (
                <LoginButton className={NAVBAR_LINK_CLASSES}/>
            )}
        </nav>
    );
};

export default DesktopNavigation;