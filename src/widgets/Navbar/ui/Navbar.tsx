import React, {FC} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logoImg from '@/assets/images/logo.svg';

interface NavbarProps {
    className?: string;
}

const Navbar: FC<NavbarProps> = ({className = ''}) => {
    return (
        <header className={`bg-gray-100 shadow-md ${className}`}>
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center">
                        <Image
                            src={logoImg}
                            alt="Logo"
                            width={50}
                            height={50}
                            className="bg-white p-2 rounded-lg mr-2"
                        />
                        <span className="text-xl font-bold">Vershkov</span>
                    </Link>
                </div>

                <nav className="flex space-x-8">
                    <Link href="/"
                          className="text-gray-800 hover:text-blue-600 font-medium px-4 py-2 rounded-md transition-colors duration-300 hover:bg-gray-200">
                        Home
                    </Link>
                    <Link href="/about"
                          className="text-gray-800 hover:text-blue-600 font-medium px-4 py-2 rounded-md transition-colors duration-300 hover:bg-gray-200">
                        About
                    </Link>
                    <Link href="/admin"
                          className="text-gray-800 hover:text-blue-600 font-medium px-4 py-2 rounded-md transition-colors duration-300 hover:bg-gray-200">
                        Admin
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
