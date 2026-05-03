import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log('Fetching list...');
  const { data, error } = await resend.emails.list();
  if (error) {
    console.error('List error:', error);
    return;
  }

  // Just print the IDs and statuses of the last 10 emails
  if (data && data.data) {
    const last10 = data.data.slice(0, 10);
    console.log('Last 10 emails in list:');
    last10.forEach(e => {
      console.log(`ID: ${e.id}, Event: ${e.last_event}, To: ${e.to.join(',')}`);
    });
  } else {
    console.log('No data found.', data);
  }
}

main().catch(console.error);
