import * as React from 'react';
import { SendEmailForm } from './SendEmailForm';
import { getUsersForEmail } from './actions';

export const dynamic = 'force-dynamic';

export default async function SendEmailPage() {
  const users = await getUsersForEmail();

  return <SendEmailForm users={users} />;
}
