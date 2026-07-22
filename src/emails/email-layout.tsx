import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components';
import * as React from 'react';

export interface EmailDetail {
  label: string;
  value: React.ReactNode;
}

interface EmailFrameProps {
  preview: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  brand?: string;
}

interface EmailActionProps {
  href: string;
  children: React.ReactNode;
  tone?: 'primary' | 'danger' | 'secondary';
  compact?: boolean;
}

interface EmailNoticeProps {
  children: React.ReactNode;
  tone?: 'info' | 'danger';
}

interface EmailFallbackLinkProps {
  hint: string;
  href: string;
}

/**
 * Общая оболочка писем Vershkov: бренд, ритм, типографика и подвал.
 */
export const EmailFrame = ({ preview, children, footer, brand = 'Vershkov' }: EmailFrameProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.brandSection}>
            <Text style={emailStyles.brand}>{brand}</Text>
          </Section>

          <Section style={emailStyles.content}>{children}</Section>

          {footer ? (
            <>
              <Hr style={emailStyles.divider} />
              <Section style={emailStyles.footerSection}>{footer}</Section>
            </>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
};

export const EmailHeading = ({
  children,
  align = 'center'
}: {
  children: React.ReactNode;
  align?: 'center' | 'left';
}) => {
  return (
    <Heading style={align === 'left' ? emailStyles.headingLeft : emailStyles.heading}>
      {children}
    </Heading>
  );
};

export const EmailParagraph = ({ children }: { children: React.ReactNode }) => {
  return <Text style={emailStyles.paragraph}>{children}</Text>;
};

export const EmailMessage = ({ children }: { children: React.ReactNode }) => {
  return <Text style={emailStyles.message}>{children}</Text>;
};

export const EmailDetails = ({ details }: { details: EmailDetail[] }) => {
  return (
    <Section style={emailStyles.details}>
      {details.map(detail => (
        <Text key={detail.label} style={emailStyles.detailRow}>
          <span style={emailStyles.detailLabel}>{detail.label.replace(/:$/, '')}:</span>{' '}
          {detail.value}
        </Text>
      ))}
    </Section>
  );
};

export const EmailAction = ({
  href,
  children,
  tone = 'primary',
  compact = false
}: EmailActionProps) => {
  const style =
    tone === 'danger'
      ? emailStyles.dangerAction
      : tone === 'secondary'
        ? emailStyles.secondaryAction
        : emailStyles.primaryAction;

  return (
    <Section style={compact ? emailStyles.compactActionSection : emailStyles.actionSection}>
      <Button href={href} style={style}>
        {children}
      </Button>
    </Section>
  );
};

export const EmailNotice = ({ children, tone = 'info' }: EmailNoticeProps) => {
  return (
    <Section style={tone === 'danger' ? emailStyles.dangerNotice : emailStyles.infoNotice}>
      <Text style={tone === 'danger' ? emailStyles.dangerNoticeText : emailStyles.noticeText}>
        {children}
      </Text>
    </Section>
  );
};

export const EmailFallbackLink = ({ hint, href }: EmailFallbackLinkProps) => {
  return (
    <Section style={emailStyles.fallbackLinkSection}>
      <Text style={emailStyles.fallbackHint}>{hint}</Text>
      <Link href={href} style={emailStyles.fallbackLink}>
        {href}
      </Link>
    </Section>
  );
};

export const EmailFooter = ({ children }: { children: React.ReactNode }) => {
  return <Text style={emailStyles.footerText}>{children}</Text>;
};

export const emailStyles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: '#f6f3f8',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: '0',
    padding: '36px 12px'
  },
  container: {
    backgroundColor: '#fefcff',
    border: '1px solid #e4deea',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(68, 49, 88, 0.08)',
    margin: '0 auto',
    maxWidth: '560px',
    overflow: 'hidden'
  },
  brandSection: {
    backgroundColor: '#eee8f7',
    padding: '19px 32px',
    textAlign: 'center'
  },
  brand: {
    color: '#5d447d',
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    margin: '0',
    textTransform: 'uppercase'
  },
  content: {
    padding: '32px'
  },
  heading: {
    color: '#302b37',
    fontSize: '25px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    lineHeight: '32px',
    margin: '0 0 20px',
    textAlign: 'center'
  },
  headingLeft: {
    color: '#302b37',
    fontSize: '25px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    lineHeight: '32px',
    margin: '0 0 12px',
    textAlign: 'left'
  },
  paragraph: {
    color: '#504a59',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 12px'
  },
  message: {
    backgroundColor: '#f7f4fa',
    border: '1px solid #e3ddea',
    borderRadius: '12px',
    color: '#504a59',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '20px 0',
    padding: '16px',
    whiteSpace: 'pre-wrap'
  },
  details: {
    backgroundColor: '#f7f4fa',
    border: '1px solid #e3ddea',
    borderRadius: '12px',
    margin: '22px 0',
    padding: '14px 18px'
  },
  detailRow: {
    color: '#504a59',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0 0 7px'
  },
  detailLabel: {
    color: '#5d447d',
    fontWeight: 700
  },
  actionSection: {
    margin: '28px 0 18px',
    textAlign: 'center'
  },
  compactActionSection: {
    margin: '0 0 18px',
    textAlign: 'center'
  },
  primaryAction: {
    backgroundColor: '#684895',
    borderRadius: '10px',
    color: '#fefcff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 700,
    padding: '13px 22px',
    textDecoration: 'none'
  },
  dangerAction: {
    backgroundColor: '#a64f46',
    borderRadius: '10px',
    color: '#fffdfd',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 700,
    padding: '13px 22px',
    textDecoration: 'none'
  },
  secondaryAction: {
    backgroundColor: '#fefcff',
    border: '1px solid #cfc5da',
    borderRadius: '10px',
    color: '#5d447d',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 700,
    padding: '11px 20px',
    textDecoration: 'none'
  },
  infoNotice: {
    backgroundColor: '#f1edf8',
    border: '1px solid #ded5eb',
    borderRadius: '10px',
    margin: '18px 0',
    padding: '12px 16px'
  },
  dangerNotice: {
    backgroundColor: '#fff4f2',
    border: '1px solid #eccdca',
    borderRadius: '10px',
    margin: '18px 0',
    padding: '12px 16px'
  },
  noticeText: {
    color: '#514564',
    fontSize: '14px',
    lineHeight: '21px',
    margin: '0'
  },
  dangerNoticeText: {
    color: '#8d4039',
    fontSize: '14px',
    lineHeight: '21px',
    margin: '0'
  },
  fallbackLinkSection: {
    margin: '0 0 4px'
  },
  fallbackHint: {
    color: '#78717f',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0 0 4px'
  },
  fallbackLink: {
    color: '#5d447d',
    fontSize: '13px',
    lineHeight: '20px',
    textDecoration: 'underline',
    wordBreak: 'break-all'
  },
  divider: {
    borderColor: '#e5dfe9',
    margin: '0 32px'
  },
  footerSection: {
    padding: '18px 32px 22px'
  },
  footerText: {
    color: '#78717f',
    fontSize: '12px',
    lineHeight: '19px',
    margin: '0 0 6px',
    textAlign: 'center'
  },
  footerLink: {
    color: '#5d447d',
    textDecoration: 'underline'
  },
  metadata: {
    color: '#74647f',
    fontSize: '13px',
    letterSpacing: '0.01em',
    lineHeight: '20px',
    margin: '0 0 12px'
  },
  image: {
    borderRadius: '12px',
    display: 'block',
    height: 'auto',
    margin: '0 0 22px',
    maxWidth: '100%',
    width: '100%'
  }
};
