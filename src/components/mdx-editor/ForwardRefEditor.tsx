'use client';

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import type { InitializedMdxEditorProps } from './InitializedMdxEditor';

/** Тип публичного интерфейса редактора — без внутреннего editorRef (управляется через forwardRef). */
export type ForwardRefEditorProps = Omit<InitializedMdxEditorProps, 'editorRef'>;

/**
 * Единственное место динамического импорта MDXEditor с ssr: false.
 *
 * Следует официальному паттерну Next.js App Router для MDXEditor:
 * https://mdxeditor.dev/editor/docs/getting-started
 *
 * Все потребители (blog-editor, client-notes и другие) импортируют ForwardRefEditor
 * и получают гарантированную клиентскую инициализацию без дублирования dynamic().
 */
const Editor = dynamic(() => import('./InitializedMdxEditor'), {
  ssr: false,
  loading: () => null
});

/**
 * Переиспользуемый MDXEditor с поддержкой forwardRef.
 *
 * Использует IoC-паттерн через пропс toolbarContents для настройки тулбара
 * без изменения базового компонента.
 *
 * @example
 * // Простой редактор (заметки клиента)
 * const ref = useRef<MDXEditorMethods>(null);
 * <ForwardRefEditor ref={ref} value={markdown} onChange={setMarkdown} />
 *
 * @example
 * // Расширенный редактор — кастомный toolbar через адаптер
 * <MdxEditorWrapper ref={editorRef} value={editorValue} diffMarkdown={diff} ... />
 */
export const ForwardRefEditor = forwardRef<MDXEditorMethods, ForwardRefEditorProps>(
  (props, ref) => <Editor {...props} editorRef={ref} />
);

ForwardRefEditor.displayName = 'ForwardRefEditor';
