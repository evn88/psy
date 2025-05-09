import React, {FC} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logoImg from '@/assets/images/logo.svg';

interface NavbarProps {
    className?: string;
}

const Navbar: FC<NavbarProps> = ({className = ''}) => {
    
    return (
        <header className={`bg-gray-800 shadow-md ${className}`}>
            <div className="container mx-auto px-0 py-3 flex justify-between items-center">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center ">
                        <Image
                            src={logoImg}
                            alt="Logo"
                            width={50}
                            height={50}
                            className="bg-white rounded-lg p-1"
                        />
                    </Link>
                </div>

                <nav className="flex space-x-8 ">
                    <Link href="/"
                          className="text-white-800 hover:text-blue-300 font-medium px-4 py-2 rounded-md transition-colors duration-300 hover:bg-gray-600">
                        Home
                    </Link>
                    <Link href="/about"
                          className="text-white-800 hover:text-blue-300 font-medium px-4 py-2 rounded-md transition-colors duration-300 hover:bg-gray-600">
                        About
                    </Link>
                    <Link href="/auth"
                          className="text-white-800 hover:text-blue-300 font-medium px-4 py-2 rounded-md transition-colors duration-300 hover:bg-gray-600">
                        Login
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
