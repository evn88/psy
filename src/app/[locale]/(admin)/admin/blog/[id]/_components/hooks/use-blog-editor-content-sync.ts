import type { MDXEditorMethods } from '@mdxeditor/editor';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { BlogEditorVersion, EditorTranslation } from '../blog-editor-form.types';

interface UseBlogEditorContentSyncParams {
  editorRef: RefObject<MDXEditorMethods | null>;
  activeLocale: EditorTranslation['locale'];
  activeTranslation: EditorTranslation;
  selectedVersion: BlogEditorVersion | null;
}

/**
 * Возвращает markdown, который должен быть отображён в редакторе.
 *
 * @param params Активная локаль, текущий перевод и выбранная версия.
 * @returns Markdown для отображения в редакторе.
 */
const getEditorMarkdown = ({
  activeLocale,
  activeTranslation,
  selectedVersion
}: Omit<UseBlogEditorContentSyncParams, 'editorRef'>) => {
  if (!selectedVersion) {
    return activeTranslation.content;
  }

  return (
    selectedVersion.translations.find(translation => translation.locale === activeLocale)
      ?.content ?? ''
  );
};

/**
 * Синхронизирует MDX-редактор с активной локалью и выбранной версией.
 *
 * @param params Ссылка на редактор и входные данные для markdown.
 * @returns Данные для основного редактора и режима diff.
 */
export const useBlogEditorContentSync = ({
  editorRef,
  activeLocale,
  activeTranslation,
  selectedVersion
}: UseBlogEditorContentSyncParams) => {
  const latestActiveTranslationRef = useRef(activeTranslation);
  const latestSelectedVersionRef = useRef(selectedVersion);
  const editorValue = getEditorMarkdown({
    activeLocale,
    activeTranslation,
    selectedVersion
  });
  const diffMarkdown = selectedVersion ? activeTranslation.content : '';

  useEffect(() => {
    latestActiveTranslationRef.current = activeTranslation;
    latestSelectedVersionRef.current = selectedVersion;
  }, [activeTranslation, selectedVersion]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setMarkdown(
        getEditorMarkdown({
          activeLocale,
          activeTranslation: latestActiveTranslationRef.current,
          selectedVersion: latestSelectedVersionRef.current
        })
      );
    }
  }, [activeLocale, editorRef, selectedVersion?.id]);

  return {
    editorValue,
    diffMarkdown
  };
};
