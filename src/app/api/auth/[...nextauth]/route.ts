import { handlers } from '@/auth';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

export const GET = withApiLogging(handlers.GET, { resolveUser: false });
export const POST = withApiLogging(handlers.POST, { resolveUser: false });
