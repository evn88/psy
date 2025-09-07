import React, {FC} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logoImg from '@/assets/images/logo.svg';
import {auth} from "@/auth";
import LoginButton from './LoginButton';
import UserDropdown from './UserDropdown';


interface NavbarProps {
    className?: string;
}

const NAVBAR_LINK_CLASSES = "text-white-800 hover:text-blue-300 font-medium px-4 py-2 h-[50px] flex items-center rounded-md transition-colors duration-300 hover:bg-gray-600";

const Navbar: FC<NavbarProps> = async ({className = ''}) => {
    const session = await auth()

    return (
        <header className={`bg-gray-800 shadow-md ${className}`}>
            <div className="container mx-auto px-0 py-3 flex justify-between items-center">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center ">
                        <Image
                            src={logoImg}
                            alt="Logo"
                            width={64}
                            height={64}
                            className="bg-white rounded-lg p-1"
                        />
                    </Link>
                </div>

                <nav className="flex space-x-8 ">
                    <Link href="/"
                          className={NAVBAR_LINK_CLASSES}>
                        Главная
                    </Link>
                    <Link href="/about"
                          className={NAVBAR_LINK_CLASSES}>
                        Обо мне
                    </Link>

                    {session ? (
                        <UserDropdown session={session} className={NAVBAR_LINK_CLASSES}/>
                    ) : (
                        <LoginButton className={NAVBAR_LINK_CLASSES}/>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;