import { EventStatus, EventType } from '@prisma/client';

export interface ParsedEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: EventType;
  status: EventStatus;
  meetLink: string | null;
  userId: string | null;
  isExternal: boolean;
}

export function parseICal(icalData: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = icalData.split(/\r?\n/);

  let inEvent = false;
  let currentEvent: any = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle line folding (lines starting with space usually continue previous)
    // We'll keep it simple for SUMMARY and DATES. Dates are not folded.

    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (currentEvent.dtstart && currentEvent.dtend) {
        events.push({
          id: currentEvent.uid || `external-${Date.now()}-${Math.random()}`,
          title: currentEvent.summary || 'Google Event (Busy)',
          start: parseICalDate(currentEvent.dtstart),
          end: parseICalDate(currentEvent.dtend),
          type: 'OTHER',
          status: 'SCHEDULED',
          meetLink: null,
          userId: null, // external, unbookable but visible
          isExternal: true
        });
      }
      continue;
    }

    if (inEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      } else if (line.startsWith('SUMMARY;')) {
        const parts = line.split(':');
        currentEvent.summary = parts.slice(1).join(':');
      } else if (line.startsWith('DTSTART')) {
        currentEvent.dtstart = line.substring(line.indexOf(':') + 1);
      } else if (line.startsWith('DTEND')) {
        currentEvent.dtend = line.substring(line.indexOf(':') + 1);
      } else if (line.startsWith('UID:')) {
        currentEvent.uid = line.substring(4);
      }
    }
  }

  return events;
}

function parseICalDate(dateStr: string): Date {
  // Typical Google Calendar formats:
  // "20240322T150000Z" (UTC)
  // "20240322T180000" (Local without Z, usually handled locally)
  // "20240322" (All day)

  if (dateStr.length === 8) {
    // All day YYYYMMDD
    const y = parseInt(dateStr.substring(0, 4), 10);
    const m = parseInt(dateStr.substring(4, 6), 10) - 1;
    const d = parseInt(dateStr.substring(6, 8), 10);
    return new Date(y, m, d);
  }

  const y = parseInt(dateStr.substring(0, 4), 10);
  const m = parseInt(dateStr.substring(4, 6), 10) - 1;
  const d = parseInt(dateStr.substring(6, 8), 10);
  const h = parseInt(dateStr.substring(9, 11), 10) || 0;
  const min = parseInt(dateStr.substring(11, 13), 10) || 0;
  const s = parseInt(dateStr.substring(13, 15), 10) || 0;

  if (dateStr.endsWith('Z')) {
    return new Date(Date.UTC(y, m, d, h, min, s));
  }

  // Assume generic local time
  return new Date(y, m, d, h, min, s);
}
