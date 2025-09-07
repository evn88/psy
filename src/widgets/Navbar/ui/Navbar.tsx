'use client';

import React, {FC, useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Session} from 'next-auth';
import logoImg from '@/assets/images/logo.svg';
import MobileMenuButton from './MobileMenuButton';
import MobileMenu from './MobileMenu';
import DesktopNavigation from './DesktopNavigation';

interface NavbarProps {
    session: Session | null;
    className?: string;
}

const Navbar: FC<NavbarProps> = ({session, className = ''}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className={`bg-gray-800 shadow-md ${className}`}>
            <div className="container mx-auto px-0 py-3">
                {/* Desktop and Mobile Header */}
                <div className="flex justify-between items-center px-4 md:px-0">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <Image
                                src={logoImg}
                                alt="Logo"
                                width={64}
                                height={64}
                                className="bg-white rounded-lg p-1"
                            />
                        </Link>
                    </div>

                    <DesktopNavigation session={session}/>

                    <MobileMenuButton
                        isOpen={isMobileMenuOpen}
                        onClick={toggleMobileMenu}
                    />
                </div>

                <MobileMenu
                    isOpen={isMobileMenuOpen}
                    session={session}
                    onLinkClick={closeMobileMenu}
                />
            </div>
        </header>
    );
};

export default Navbar;