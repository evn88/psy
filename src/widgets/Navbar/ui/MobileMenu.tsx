'use client';

import React, {FC} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Session} from 'next-auth';
import LoginButton from './LoginButton';
import LogoutButton from './LogoutButton';

interface MobileMenuProps {
    isOpen: boolean;
    session: Session | null;
    onLinkClick?: () => void;
}

const MOBILE_NAVBAR_LINK_CLASSES = "text-white-800 hover:text-blue-300 font-medium px-4 py-3 block rounded-md transition-colors duration-300 hover:bg-gray-600 border-b border-gray-700 last:border-b-0";

const MobileMenu: FC<MobileMenuProps> = ({isOpen, session, onLinkClick}) => {
    if (!isOpen) return null;

    return (
        <nav className="md:hidden mt-4 pt-4 border-t border-gray-700 animate-fade-in">
            <div className="space-y-1">
                <Link
                    href="/"
                    className={MOBILE_NAVBAR_LINK_CLASSES}
                    onClick={onLinkClick}
                >
                    Главная
                </Link>
                <Link
                    href="/about"
                    className={MOBILE_NAVBAR_LINK_CLASSES}
                    onClick={onLinkClick}
                >
                    Обо мне
                </Link>
                <div className="border-b border-gray-700">
                    {session ? (
                        <div className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-3">
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
                            </div>
                            <Link
                                href="/profile"
                                className="block text-white-800 hover:text-blue-300 py-2 transition-colors"
                                onClick={onLinkClick}
                            >
                                Профиль
                            </Link>
                            <div className="py-2">
                                <LogoutButton
                                    className="text-white-800 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-0"/>
                            </div>
                        </div>
                    ) : (
                        <div className="px-4 py-3">
                            <LoginButton className="text-white-800 hover:text-blue-300 transition-colors"/>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default MobileMenu;