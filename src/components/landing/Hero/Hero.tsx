import Image from 'next/image';
import HeroNav from './HeroNav';
import styles from './Hero.module.css';

import catImg from '@/assets/images/adhd/cat-roll.png';
import dogImg from '@/assets/images/adhd/scared_dog.png';
import envelopImg from '@/assets/images/adhd/envelop.png';
import blueBgImg from '@/assets/images/adhd/blue-paper-bg.png';
import blueBgEdge from '@/assets/images/adhd/blue-bg-edge.png';
import Link from 'next/link';

/** Hero — первый экран лендинга */
const Hero = () => {
  return (
    <section className={styles.hero}>
      {/* Синие горы снизу (фото) */}
      <div
        className={styles.hero__blueBg}
        style={{ backgroundImage: `url(${blueBgImg.src})` }}
        aria-hidden="true"
      />
      <div
        className={styles.hero__mountains}
        style={{ backgroundImage: `url(${blueBgEdge.src})` }}
        aria-hidden="true"
      />

      {/* Конверт — фон всей секции, не обрезается overflow:hidden */}
      <div
        className={styles.hero__envelopImg}
        style={{ backgroundImage: `url(${envelopImg.src})` }}
        aria-hidden="true"
      />

      {/* Крафт-конверт */}
      <div className={styles.hero__envelope}>
        {/* Белая карточка */}
        <div className={styles.hero__card}>
          <HeroNav />

          <div className={styles.hero__content}>
            {/* Заголовок с SVG-овалом */}
            <h1 className={styles.hero__title}>
              <span className={styles.hero__titleCircled}>
                {/*<span className={styles.hero__oval} aria-hidden="true" />*/}
                <span className={styles.hero__titleAccent}>ты устал?</span>
              </span>{' '}
              от бесконечной борьбы с прокрастинацией, тревогой и выгоранием?
            </h1>

            {/* Подзаголовок */}
            <p className={styles.hero__sub}>
              Снова обещаешь себе «собраться» — и снова
              <br />
              чувствуешь вину и стыд, когда не получается.
            </p>

            {/* Хайлайт */}
            <p>
              <span className={styles.hero__highlight}>А внутри всё время вопрос:</span>
            </p>
            <p className={styles.hero__question}>
              Почему я не могу, как другие? <br />
              <span className={styles.hero__questionAccent}>Что со мной не так?</span>
            </p>

            {/* Стрелка вниз */}
            <div className={styles.hero__arrow} aria-hidden="true">
              <Image src="/images/adhd/hero-arrow.svg" alt="" width={33} height={100} unoptimized />
            </div>

            {/* Фото кота (абсолютно слева) */}
            <div className={styles.hero__cat}>
              <Image
                src={catImg}
                alt="Кот в одеяле"
                sizes="(max-width: 768px) 120px, 240px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>

            {/* Фото собаки (абсолютно справа) */}
            <div className={styles.hero__dog}>
              <Image
                src={dogImg}
                alt="Удивлённая собака"
                sizes="(max-width: 768px) 100px, 242px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Hero };
