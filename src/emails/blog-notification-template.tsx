import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components';

interface BlogNotificationEmailProps {
  recipientName?: string;
  title: string;
  description: string;
  coverImage?: string;
  authorName?: string;
  readingTime: number;
  publishedAt: string;
  articleUrl: string;
  unsubscribeUrl?: string;
  locale?: string;
}

const labels = {
  ru: {
    preview: 'Новая статья в блоге',
    by: 'Автор',
    readTime: 'мин чтения',
    readButton: 'Читать статью полностью',
    footer: 'Вы получили это письмо, потому что подписались на обновления блога.',
    unsubscribe: 'Отписаться',
    manageNotifications: 'Управлять уведомлениями'
  },
  en: {
    preview: 'New blog article',
    by: 'by',
    readTime: 'min read',
    readButton: 'Read full article',
    footer: 'You received this email because you subscribed to blog updates.',
    unsubscribe: 'Unsubscribe',
    manageNotifications: 'Manage notifications'
  },
  sr: {
    preview: 'Novi blog članak',
    by: 'autor',
    readTime: 'min čitanja',
    readButton: 'Pročitajte ceo članak',
    footer: 'Dobili ste ovaj email jer ste se pretplatili na blog novosti.',
    unsubscribe: 'Otpretplatite se',
    manageNotifications: 'Upravljajte obaveštenjima'
  }
};

export function BlogNotificationEmail({
  title,
  description,
  coverImage,
  authorName,
  readingTime,
  publishedAt,
  articleUrl,
  unsubscribeUrl,
  locale = 'ru'
}: BlogNotificationEmailProps) {
  const t = labels[locale as keyof typeof labels] ?? labels.ru;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vershkov.com';

  return (
    <Html>
      <Head />
      <Preview>
        {t.preview}: {title}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Шапка */}
          <Section style={header}>
            <Link href={appUrl} style={logoLink}>
              <Text style={logoText}>Vershkov.com</Text>
            </Link>
          </Section>

          {/* Обложка */}
          {coverImage && (
            <Section style={{ padding: '0' }}>
              <Img src={coverImage} alt={title} width="600" style={heroImage} />
            </Section>
          )}

          {/* Контент */}
          <Section style={content}>
            {/* Мета */}
            <Text style={meta}>
              {authorName && `${t.by} ${authorName}  •  `}
              {readingTime} {t.readTime} • {publishedAt}
            </Text>

            {/* Заголовок */}
            <Heading style={heading}>{title}</Heading>

            {/* Описание */}
            <Text style={body}>{description}</Text>

            {/* Кнопка */}
            <Section style={buttonContainer}>
              <Button href={articleUrl} style={button}>
                {t.readButton}
              </Button>
            </Section>
          </Section>

          <Hr style={divider} />

          {/* Подвал */}
          <Section style={footer}>
            <Text style={footerText}>{t.footer}</Text>
            {unsubscribeUrl ? (
              <Text style={footerText}>
                <Link href={unsubscribeUrl} style={footerLink}>
                  {t.unsubscribe}
                </Link>
              </Text>
            ) : (
              <Text style={footerText}>
                <Link href={`${appUrl}/my/settings`} style={footerLink}>
                  {t.manageNotifications}
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Стили
const main = {
  backgroundColor: '#F2F2F2',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

const container = {
  backgroundColor: '#FFFFFF',
  margin: '0 auto',
  maxWidth: '600px'
};

const header = {
  backgroundColor: '#03070A',
  padding: '20px 32px'
};

const logoLink = { textDecoration: 'none' };

const logoText = {
  color: '#FFFFFF',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0'
};

const heroImage = {
  width: '100%',
  maxHeight: '300px',
  objectFit: 'cover' as const,
  display: 'block'
};

const content = {
  padding: '32px'
};

const meta = {
  color: '#900A0B',
  fontSize: '13px',
  margin: '0 0 12px 0',
  letterSpacing: '0.02em'
};

const heading = {
  color: '#03070A',
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 16px 0'
};

const body = {
  color: '#353535',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0'
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0'
};

const button = {
  backgroundColor: '#900A0B',
  borderRadius: '6px',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block'
};

const divider = {
  borderColor: '#E2E2E2',
  margin: '0'
};

const footer = {
  padding: '24px 32px',
  backgroundColor: '#F2F2F2'
};

const footerText = {
  color: '#888888',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
  textAlign: 'center' as const
};

const footerLink = {
  color: '#900A0B',
  textDecoration: 'underline'
};
