import { Img, Link, Text } from '@react-email/components';
import {
  EmailAction,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph,
  emailStyles
} from '@/emails/email-layout';

interface BlogNotificationEmailProps {
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
    readButton: 'Читать статью',
    footer: 'Вы получили это письмо, потому что подписались на обновления блога.',
    unsubscribe: 'Отписаться',
    manageNotifications: 'Управлять уведомлениями'
  },
  en: {
    preview: 'New blog article',
    by: 'by',
    readTime: 'min read',
    readButton: 'Read article',
    footer: 'You received this email because you subscribed to blog updates.',
    unsubscribe: 'Unsubscribe',
    manageNotifications: 'Manage notifications'
  },
  sr: {
    preview: 'Novi blog članak',
    by: 'autor',
    readTime: 'min čitanja',
    readButton: 'Pročitajte članak',
    footer: 'Dobili ste ovaj email jer ste se pretplatili na blog novosti.',
    unsubscribe: 'Otpretplatite se',
    manageNotifications: 'Upravljajte obaveštenjima'
  }
};

/**
 * Рендерит локализованное письмо подписчикам о новой статье.
 */
export const BlogNotificationEmail = ({
  title,
  description,
  coverImage,
  authorName,
  readingTime,
  publishedAt,
  articleUrl,
  unsubscribeUrl,
  locale = 'ru'
}: BlogNotificationEmailProps) => {
  const t = labels[locale as keyof typeof labels] ?? labels.ru;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vershkov.com';
  const footerUrl = unsubscribeUrl ?? `${appUrl}/my/settings`;
  const footerAction = unsubscribeUrl ? t.unsubscribe : t.manageNotifications;
  const metadata = [
    authorName ? `${t.by} ${authorName}` : null,
    `${readingTime} ${t.readTime}`,
    publishedAt
  ].filter(Boolean);

  return (
    <EmailFrame
      preview={`${t.preview}: ${title}`}
      footer={
        <>
          <EmailFooter>{t.footer}</EmailFooter>
          <EmailFooter>
            <Link href={footerUrl} style={emailStyles.footerLink}>
              {footerAction}
            </Link>
          </EmailFooter>
        </>
      }
    >
      {coverImage ? <Img src={coverImage} alt={title} style={emailStyles.image} /> : null}
      <Text style={emailStyles.metadata}>{t.preview}</Text>
      <EmailHeading align="left">{title}</EmailHeading>
      <Text style={emailStyles.metadata}>{metadata.join(' · ')}</Text>
      <EmailParagraph>{description}</EmailParagraph>
      <EmailAction href={articleUrl}>{t.readButton}</EmailAction>
    </EmailFrame>
  );
};
