import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const ids = ['91b6741b-dc05-4447-8452-211cc8fe3ecb', '2b1e4748-34b0-4aec-b09a-5ba1d64a4b8b'];

  for (const id of ids) {
    console.log(`Checking ${id}...`);
    const result = await resend.emails.get(id);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
