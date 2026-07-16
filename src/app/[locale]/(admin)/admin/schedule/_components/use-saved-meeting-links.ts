'use client';

import { useEffect, useState } from 'react';

import { getSafeMeetingUrl } from '@/lib/safe-url';

const MEETING_LINKS_STORAGE_KEY = 'schedule_savedMeetingLinks';
const MAX_SAVED_MEETING_LINKS = 12;

const parseStoredLinks = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map(item => getSafeMeetingUrl(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, MAX_SAVED_MEETING_LINKS);
  } catch {
    return [];
  }
};

/**
 * Управляет локальной историей безопасных ссылок на звонок.
 * @returns Список ссылок и операции сохранения/удаления.
 */
export const useSavedMeetingLinks = () => {
  const [links, setLinks] = useState<string[]>([]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setLinks(parseStoredLinks(window.localStorage.getItem(MEETING_LINKS_STORAGE_KEY)));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const persistLinks = (nextLinks: string[]) => {
    setLinks(nextLinks);
    window.localStorage.setItem(MEETING_LINKS_STORAGE_KEY, JSON.stringify(nextLinks));
  };

  const saveLink = (value: string | null | undefined) => {
    const safeLink = getSafeMeetingUrl(value);
    if (!safeLink) {
      return;
    }

    persistLinks(
      [safeLink, ...links.filter(link => link !== safeLink)].slice(0, MAX_SAVED_MEETING_LINKS)
    );
  };

  const removeLink = (value: string) => {
    persistLinks(links.filter(link => link !== value));
  };

  return { links, saveLink, removeLink };
};
