import Image from 'next/image';
import { useTranslations } from 'next-intl';
import styles from './DevBanner.module.css';

import bluePaperBg from '@/assets/images/adhd/blue-paper-bg.png';
import catImg from '@/assets/images/adhd/cat-1.png';
import paperImg from '@/assets/images/adhd/paper-small.png';
import tapePinkImg from '@/assets/images/adhd/tape-pink.png';

/**
 * Плашка «Сайт в разработке» между секциями лендинга.
 * Самостоятельно загружает свои переводы.
 * @returns Баннер между hero и footer.
 */
export const DevBanner = () => {
  const t = useTranslations('Home.devBanner');

  return (
    <div className={styles.wrap} style={{ backgroundImage: `url(${bluePaperBg.src})` }}>
      <div className={styles.note}>
        {/* Лента сверху */}
        <div className={styles.tape} aria-hidden="true">
          <Image src={tapePinkImg} alt="" className={styles.tapeImg} />
        </div>

        {/* Фон — клетчатый лист */}
        <Image
          src={paperImg}
          alt=""
          fill
          sizes="(max-width: 600px) calc(100vw - 3rem), (max-width: 1280px) 55vw, 800px"
          className={styles.paper}
          aria-hidden
        />

        {/* Котик */}
        <div className={styles.cat} aria-hidden="true">
          <Image src={catImg} alt="" className={styles.catImg} />
        </div>

        {/* Контент */}
        <div className={styles.content}>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.sub}>
            {t('descriptionLine1')}
            <br />
            {t('descriptionLine2')}
          </p>
        </div>
      </div>
    </div>
  );
};
