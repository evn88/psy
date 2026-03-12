import * as React from 'react';
import { SendEmailForm } from './send-email-form';
import { getUsersForEmail } from './actions';

export default async function SendEmailPage() {
  const users = await getUsersForEmail();

  return <SendEmailForm users={users} />;
}
