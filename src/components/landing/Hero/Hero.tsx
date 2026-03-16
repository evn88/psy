import Image from 'next/image';
import HeroNav from './HeroNav';
import styles from './Hero.module.css';

import catImg from '@/assets/images/adhd/cat-rug.png';
import dogImg from '@/assets/images/adhd/scared_dog.png';
import envelopImg from '@/assets/images/adhd/envelop.png';
import blueBgImg from '@/assets/images/adhd/blue-paper-bg.png';

/** Hero — первый экран лендинга */
const Hero = () => {
  return (
    <section className={styles.hero}>
      {/* Синие горы снизу (фото) */}
      <div className={styles.hero__mountains} aria-hidden="true">
        <Image
          src={blueBgImg}
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'top' }}
          priority
        />
      </div>

      {/* Крафт-конверт */}
      <div className={styles.hero__envelope}>
        <Image
          src={envelopImg}
          alt=""
          aria-hidden="true"
          className={styles.hero__envelopImg}
          sizes="(max-width: 768px) 100vw, 1160px"
          style={{ width: '100%', height: 'auto' }}
        />

        {/* Белая карточка */}
        <div className={styles.hero__card}>
          <HeroNav />

          <div className={styles.hero__content}>
            {/* Заголовок с SVG-овалом */}
            <h1 className={styles.hero__title}>
              <span className={styles.hero__titleCircled}>
                <Image
                  src="/images/adhd/hero-oval.svg"
                  alt=""
                  aria-hidden="true"
                  width={352}
                  height={112}
                  className={styles.hero__oval}
                  unoptimized
                />
                ты устал
              </span>{' '}
              от бесконечной борьбы с прокрастинацией, тревогой и выгоранием?
            </h1>

            {/* Подзаголовок */}
            <p className={styles.hero__sub}>
              Снова обещаешь себе «собраться» — и снова чувствуешь вину и стыд, когда не получается.
            </p>

            {/* Хайлайт */}
            <p className={styles.hero__question}>
              <span className={styles.hero__highlight}>А внутри всё время вопрос:</span>
              <br />
              «Почему я не могу, как другие? Что со мной не так?»
            </p>

            {/* Стрелка вниз */}
            <div className={styles.hero__arrow} aria-hidden="true">
              <Image src="/images/adhd/hero-arrow.svg" alt="" width={33} height={100} unoptimized />
            </div>
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
              sizes="(max-width: 768px) 100px, 200px"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export { Hero };
