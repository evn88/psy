'use client';

import { useEffect, useRef, useState } from 'react';

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
  const linksRef = useRef<string[]>([]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      try {
        const storedLinks = parseStoredLinks(
          window.localStorage.getItem(MEETING_LINKS_STORAGE_KEY)
        );
        linksRef.current = storedLinks;
        setLinks(storedLinks);
      } catch {
        // История ссылок необязательна и не должна ломать форму при запрете localStorage.
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const persistLinks = (updateLinks: (currentLinks: string[]) => string[]) => {
    const nextLinks = updateLinks(linksRef.current);
    linksRef.current = nextLinks;
    setLinks(nextLinks);

    try {
      window.localStorage.setItem(MEETING_LINKS_STORAGE_KEY, JSON.stringify(nextLinks));
    } catch {
      // В памяти история остаётся доступной до перезагрузки страницы.
    }
  };

  const saveLink = (value: string | null | undefined) => {
    const safeLink = getSafeMeetingUrl(value);
    if (!safeLink) {
      return;
    }

    persistLinks(currentLinks =>
      [safeLink, ...currentLinks.filter(link => link !== safeLink)].slice(
        0,
        MAX_SAVED_MEETING_LINKS
      )
    );
  };

  const removeLink = (value: string) => {
    persistLinks(currentLinks => currentLinks.filter(link => link !== value));
  };

  return { links, saveLink, removeLink };
};
