import Image from 'next/image';
import styles from './DevBanner.module.css';

import paperImg from '@/assets/images/adhd/paper-small.png';
import bluePaperBg from '@/assets/images/adhd/blue-paper-bg.png';
import tapePinkImg from '@/assets/images/adhd/tape-pink.png';
import catImg from '@/assets/images/adhd/cat-1.png';

/** Плашка «Сайт в разработке» между секциями лендинга */
export const DevBanner = () => {
  return (
    <div className={styles.wrap} style={{ backgroundImage: `url(${bluePaperBg.src})` }}>
      <div className={styles.note}>
        {/* Лента сверху */}
        <div className={styles.tape} aria-hidden="true">
          <Image src={tapePinkImg} alt="" className={styles.tapeImg} />
        </div>

        {/* Фон — клетчатый лист */}
        <Image src={paperImg} alt="" fill className={styles.paper} aria-hidden />

        {/* Котик */}
        <div className={styles.cat} aria-hidden="true">
          <Image src={catImg} alt="" className={styles.catImg} />
        </div>

        {/* Контент */}
        <div className={styles.content}>
          <h2 className={styles.title}>Сайт в разработке</h2>
          <p className={styles.sub}>
            Здесь скоро появятся все разделы.
            <br />А пока можно написать напрямую ↓
          </p>
        </div>
      </div>
    </div>
  );
};
