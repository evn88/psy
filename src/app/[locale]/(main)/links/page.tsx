import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Download,
  Headphones,
  Instagram,
  Music2,
  Send,
  Sparkles,
  Youtube
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LINKS } from './links.constants';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Все ссылки — Анна Вершкова',
  description:
    'Запись на консультацию, гайды о СДВГ и РАС, Telegram, подкаст, YouTube и социальные сети Анны Вершковой.'
};

type MapLinkProps = {
  href: string;
  label: string;
  note: string;
  icon: ReactNode;
  className?: string;
};

const MapLink = ({ href, label, note, icon, className = '' }: MapLinkProps) => (
  <a
    className={`${styles.mapLink} ${className}`}
    href={href}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span className={styles.linkIcon} aria-hidden="true">
      {icon}
    </span>
    <span className={styles.linkCopy}>
      <strong>{label}</strong>
      <small>{note}</small>
    </span>
    <ArrowUpRight className={styles.linkArrow} aria-hidden="true" />
  </a>
);

type GuideCardProps = {
  href: string;
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
};

const GuideCard = ({ href, image, imageAlt, eyebrow, title, description, details }: GuideCardProps) => (
  <article className={styles.guideCard}>
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.guideCoverLink}>
      <Image
        src={image}
        alt={imageAlt}
        width={595}
        height={842}
        className={styles.guideCover}
        sizes="(max-width: 700px) 82vw, 360px"
      />
    </a>
    <div className={styles.guideContent}>
      <span className={styles.guideEyebrow}>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <ul>
        {details.map((detail) => <li key={detail}>{detail}</li>)}
      </ul>
      <div className={styles.guideActions}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          Читать
          <ArrowUpRight aria-hidden="true" />
        </a>
        <a href={href} download>
          Скачать PDF
          <Download aria-hidden="true" />
        </a>
      </div>
    </div>
  </article>
);

/** Страница со всеми основными материалами и площадками Анны. */
const LinksPage = () => (
  <div className={styles.page}>
    <div className={styles.starField} aria-hidden="true" />

    <header className={styles.header}>
      <Link href="/" className={styles.homeLink}>
        <span className={styles.homeMark}>АВ</span>
        <span>Анна Вершкова</span>
      </Link>
      <nav className={styles.siteNav} aria-label="Основная навигация">
        <Link href="/">Главная</Link>
        <Link href="/blog">Блог</Link>
        <Link href="/my">Личный кабинет</Link>
        <a className={styles.quickLink} href="#all-links">
          к разделам
          <ArrowRight aria-hidden="true" />
        </a>
      </nav>
    </header>

    <main>
      <section className={styles.hero}>
        <div className={styles.orbitOne} aria-hidden="true" />
        <div className={styles.orbitTwo} aria-hidden="true" />

        <div className={styles.heroCopy}>
          <span className={styles.kicker}>
            <Sparkles aria-hidden="true" />
            всё в одном месте
          </span>
          <h1>
            Выбирай, что <span>нужно</span>
          </h1>
          <p>
            Здесь можно записаться на консультацию, узнать о моём подходе и ценах,
            скачать гайды, перейти в Telegram, включить подкаст или найти мои соцсети.
          </p>
          <a className={styles.heroButton} href={LINKS.telegramCard} target="_blank" rel="noopener noreferrer">
            Записаться на консультацию
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>

        <div className={styles.portraitWrap}>
          <div className={styles.portraitCard}>
            <Image
              src="/images/links/anna-portrait.jpeg"
              alt="Анна Вершкова"
              width={768}
              height={1024}
              priority
              className={styles.portrait}
              sizes="(max-width: 700px) 76vw, 330px"
            />
            <span>Анна Вершкова · психолог</span>
          </div>
          <span className={styles.planet} aria-hidden="true">
            <Image
              src="/images/links/chat-sticker.png"
              alt=""
              width={1444}
              height={1336}
              className={styles.planetImage}
              sizes="150px"
            />
          </span>
        </div>
      </section>

      <section className={styles.mapSection} id="all-links">
        <div className={styles.sectionIntro}>
          <span className={styles.step}>старт</span>
          <div>
            <p className={styles.overline}>что здесь есть</p>
            <h2>Выберите нужный раздел</h2>
          </div>
        </div>

        <div className={styles.route}>
          <article className={`${styles.stop} ${styles.stopConsultation}`}>
            <div className={styles.stopMarker}>01</div>
            <div className={styles.stopBody}>
              <span className={styles.stopEyebrow}>консультации</span>
              <h3>Записаться и узнать, как я работаю</h3>
              <div className={styles.consultationCard}>
                <div>
                  <p className={styles.cardLabel}>Начните отсюда</p>
                  <h4>Моя Telegram-визитка</h4>
                  <p>
                    Подходы, с которыми я работаю, стоимость консультаций, ответы на частые
                    вопросы и удобная запись.
                  </p>
                  <a href={LINKS.telegramCard} target="_blank" rel="noopener noreferrer">
                    Открыть визитку
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </div>
                <div className={styles.consultationPhotoWrap}>
                  <Image
                    src="/images/links/anna-consultation.jpg"
                    alt="Анна Вершкова"
                    width={768}
                    height={1024}
                    className={styles.consultationPhoto}
                    sizes="(max-width: 700px) 75vw, 300px"
                  />
                </div>
              </div>
            </div>
          </article>

          <article className={`${styles.stop} ${styles.stopGuides}`} id="guides">
            <div className={styles.stopMarker}>02</div>
            <div className={styles.stopBody}>
              <span className={styles.stopEyebrow}>бесплатные материалы</span>
              <h3>Скачать или прочитать гайды</h3>
              <p>Оба гайда открываются прямо в браузере. Их также можно сохранить в PDF.</p>
              <div className={styles.guidesGrid}>
                <GuideCard
                  href={LINKS.adhdGuide}
                  image="/images/links/adhd-procrastination-cover.png"
                  imageAlt="Обложка гайда Как выбраться из пучины прокрастинации"
                  eyebrow="СДВГ"
                  title="Как выбраться из пучины прокрастинации"
                  description="Гайд объясняет, почему прокрастинация при СДВГ — не лень, а трудность запуска и нехватка стимуляции для управляющего центра мозга."
                  details={[
                    'Почему дедлайн временно «включает» мозг и затем оставляет без сил',
                    '4 инструмента: быстрые награды, внутренний навигатор, первый микрошаг и видимый прогресс',
                    'Практические примеры и упражнения, которые можно применить к своей задаче сразу'
                  ]}
                />
                <GuideCard
                  href={LINKS.autismGuide}
                  image="/images/links/autistic-burnout-cover.png"
                  imageAlt="Обложка гайда Аутичное выгорание или депрессия"
                  eyebrow="РАС"
                  title="Аутичное выгорание или депрессия?"
                  description="Гайд помогает разобраться, что стоит за резким упадком сил: аутичное выгорание, депрессивный эпизод или сочетание состояний."
                  details={[
                    'Признаки и причины аутичного выгорания, включая маскинг и сенсорную перегрузку',
                    'Чек-лист за последние 2 недели и таблица отличий от депрессии и обычного выгорания',
                    'Следующие шаги, виды отдыха и рабочий лист для личного плана восстановления'
                  ]}
                />
              </div>
            </div>
          </article>

          <article className={`${styles.stop} ${styles.stopMedia}`}>
            <div className={styles.stopMarker}>03</div>
            <div className={styles.stopBody}>
              <span className={styles.stopEyebrow}>канал, подкаст и соцсети</span>
              <h3>Читать, слушать и смотреть</h3>

              <div className={styles.featureGrid}>
                <a
                  className={`${styles.featureCard} ${styles.communityCard}`}
                  href={LINKS.telegramChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className={styles.featureImageWrap}>
                    <Image
                      src="/images/links/telegram-community.png"
                      alt="Иллюстрация Telegram-группы"
                      width={622}
                      height={633}
                      className={styles.featureImage}
                      sizes="(max-width: 700px) 86vw, 430px"
                    />
                  </div>
                  <div className={styles.featureContent}>
                    <span>Telegram-канал</span>
                    <h4>Комфортное пространство для уставших нейроотличных котят</h4>
                    <p>
                      Полезное про жизнь с СДВГ и РАС, система поддержки, внутренний критик,
                      навыки и мемы.
                    </p>
                    <strong>Перейти в канал <ArrowUpRight aria-hidden="true" /></strong>
                  </div>
                </a>

                <article className={`${styles.featureCard} ${styles.podcastCard}`}>
                  <div className={styles.featureImageWrap}>
                    <Image
                      src="/images/links/podcast-logo.png"
                      alt="Логотип подкаста РАСкошные"
                      width={1254}
                      height={1254}
                      className={styles.featureImage}
                      sizes="(max-width: 700px) 86vw, 430px"
                    />
                  </div>
                  <div className={styles.featureContent}>
                    <span>Подкаст «РАСкошные»</span>
                    <h4>Разговоры о жизни, психике и нейроотличиях</h4>
                    <p>Выберите, где удобнее слушать, или смотрите выпуски на YouTube.</p>
                    <div className={styles.podcastActions}>
                      <a href={LINKS.applePodcasts} target="_blank" rel="noopener noreferrer">
                        <Headphones aria-hidden="true" /> Apple Podcasts
                      </a>
                      <a href={LINKS.spotify} target="_blank" rel="noopener noreferrer">
                        <Music2 aria-hidden="true" /> Spotify
                      </a>
                      <a href={LINKS.youtube} target="_blank" rel="noopener noreferrer">
                        <Youtube aria-hidden="true" /> YouTube
                      </a>
                    </div>
                  </div>
                </article>
              </div>

              <div className={styles.linksGrid}>
                <MapLink
                  href={LINKS.instagram}
                  label="Instagram"
                  note="личное, работа и полезные материалы"
                  icon={<Instagram />}
                  className={styles.instagram}
                />
                <MapLink
                  href={LINKS.threads}
                  label="Threads"
                  note="короткие мысли и наблюдения"
                  icon={<AtSign />}
                  className={styles.threads}
                />
                <MapLink
                  href={LINKS.telegramChannel}
                  label="Telegram"
                  note="СДВГ, РАС, поддержка и мемы"
                  icon={<Send />}
                  className={styles.telegram}
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <footer className={styles.footer}>
      <span>Анна Вершкова · психолог</span>
      <Link href="/">вернуться на сайт</Link>
    </footer>
  </div>
);

export default LinksPage;
