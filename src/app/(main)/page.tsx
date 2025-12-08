'use client';

import TempPage from '@/pages/TempPage/TempPage';
import React, { Suspense } from 'react';

const HomePage = () => (
  <>
    <Suspense>
      {/*<MainPage/>*/}
      <TempPage />
    </Suspense>
  </>
);

export default HomePage;
