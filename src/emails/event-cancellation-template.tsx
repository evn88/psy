import {
  EmailAction,
  EmailDetails,
  EmailFooter,
  EmailFrame,
  EmailHeading,
  EmailNotice,
  EmailParagraph
} from '@/emails/email-layout';

interface EventCancellationTranslations {
  heading: string;
  greeting: string;
  message: string;
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
  reasonLabel: string;
  button: string;
  footer: string;
}

interface EventCancellationTemplateProps {
  name: string;
  title: string;
  eventTypeLabel: string;
  dateText: string;
  timeText: string;
  reason?: string;
  manageUrl: string;
  translations: EventCancellationTranslations;
}

/**
 * Рендерит письмо об отмене события.
 */
export const EventCancellationTemplate = ({
  eventTypeLabel,
  dateText,
  timeText,
  reason,
  manageUrl,
  translations
}: EventCancellationTemplateProps) => {
  return (
    <EmailFrame
      preview={translations.heading}
      footer={<EmailFooter>{translations.footer}</EmailFooter>}
    >
      <EmailHeading>{translations.heading}</EmailHeading>
      <EmailParagraph>{translations.greeting}</EmailParagraph>
      <EmailParagraph>{translations.message}</EmailParagraph>
      <EmailDetails
        details={[
          { label: translations.typeLabel, value: eventTypeLabel },
          { label: translations.dateLabel, value: dateText },
          { label: translations.timeLabel, value: timeText }
        ]}
      />
      {reason ? (
        <EmailNotice tone="danger">
          {translations.reasonLabel}: {reason}
        </EmailNotice>
      ) : null}
      <EmailAction href={manageUrl}>{translations.button}</EmailAction>
    </EmailFrame>
  );
};
