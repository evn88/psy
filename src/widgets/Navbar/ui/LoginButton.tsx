import React, {FC} from 'react';
import Link from 'next/link';

interface LoginButtonProps {
    className?: string;
}

const LoginButton: FC<LoginButtonProps> = ({className = ''}) => {
    return (
        <Link href="/api/auth/signin" className={className}>
            <div className="flex items-center gap-2">
                Войти
            </div>
        </Link>
    );
};

export default LoginButton;