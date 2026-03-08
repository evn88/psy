import styles from './Footer.module.css';

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">{/* TODO: контакты, политика конфиденциальности, копирайт */}</div>
    </footer>
  );
};
