'use client';

import React from 'react';
import styles from './page.module.css';

/**
 * Главная страница (Home Page)
 */
const HomePage = () => {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Заголовок</h1>
        <p className={styles.subtitle}>
          Это пример подзаголовка. Мы верстаем от мобильной версии к десктопной (Mobile First).
        </p>
      </header>
    </main>
  );
};

export default HomePage;
