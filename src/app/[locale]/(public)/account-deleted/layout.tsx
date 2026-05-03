import type { Metadata } from 'next';
import { type ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Account Deleted',
  robots: {
    index: false,
    follow: false
  }
};

const AccountDeletedLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return children;
};

export default AccountDeletedLayout;
