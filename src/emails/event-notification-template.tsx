import { Link } from '@react-email/components';
import {
  EmailAction,
  type EmailDetail,
  EmailDetails,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailParagraph,
  emailStyles
} from '@/emails/email-layout';
import { getSafeMeetingUrl } from '@/lib/safe-url';

interface EventNotificationTranslations {
  heading: string;
  greeting: string;
  message: string;
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
  meetLinkLabel: string;
  button: string;
  footer: string;
}

interface EventNotificationTemplateProps {
  name: string;
  title: string;
  eventTypeLabel: string;
  dateText: string;
  timeText: string;
  meetLink?: string;
  manageUrl: string;
  translations: EventNotificationTranslations;
}

/**
 * Рендерит письмо о создании, обновлении события или напоминании о сессии.
 */
export const EventNotificationTemplate = ({
  eventTypeLabel,
  dateText,
  timeText,
  meetLink,
  manageUrl,
  translations
}: EventNotificationTemplateProps) => {
  const safeMeetLink = getSafeMeetingUrl(meetLink);
  const details: EmailDetail[] = [
    { label: translations.typeLabel, value: eventTypeLabel },
    { label: translations.dateLabel, value: dateText },
    { label: translations.timeLabel, value: timeText }
  ];

  if (safeMeetLink) {
    details.push({
      label: translations.meetLinkLabel,
      value: (
        <Link href={safeMeetLink} style={emailStyles.fallbackLink}>
          {safeMeetLink}
        </Link>
      )
    });
  }

  return (
    <EmailFrame
      preview={translations.heading}
      footer={<EmailFooter>{translations.footer}</EmailFooter>}
    >
      <EmailHeading>{translations.heading}</EmailHeading>
      <EmailParagraph>{translations.greeting}</EmailParagraph>
      <EmailParagraph>{translations.message}</EmailParagraph>
      <EmailDetails details={details} />
      <EmailAction href={manageUrl}>{translations.button}</EmailAction>
    </EmailFrame>
  );
};
