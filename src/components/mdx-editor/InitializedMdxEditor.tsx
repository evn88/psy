'use client';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  codeBlockPlugin,
  codeMirrorPlugin,
  CreateLink,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  InsertTable,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo
} from '@mdxeditor/editor';
import { type ForwardedRef, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

/** Набор поддерживаемых языков кода в CodeMirror-блоках. */
const CODE_BLOCK_LANGUAGES = {
  js: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  jsx: 'JSX',
  css: 'CSS',
  bash: 'Bash',
  sh: 'Shell',
  json: 'JSON',
  text: 'Text'
} as const;

export interface InitializedMdxEditorProps {
  /** Управляемое значение markdown. Синхронизируется через ref.setMarkdown() при изменении. */
  value: string;
  onChange: (value: string) => void;
  /**
   * Ref на методы редактора — передаётся из ForwardRefEditor через editorRef-пропс.
   * Следует официальному паттерну Next.js App Router для MDXEditor.
   */
  editorRef?: ForwardedRef<MDXEditorMethods> | null;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  readOnly?: boolean;
  /**
   * Markdown для режима diff. Если не передан — diffSourcePlugin не подключается,
   * что исключает лишний код из бандла для простых случаев (например, заметки клиента).
   */
  diffMarkdown?: string;
  /**
   * Содержимое тулбара. IoC-паттерн: позволяет расширять тулбар снаружи
   * (добавлять PortalDiffToggle, кнопку перевода и т.д.) без изменения базового компонента.
   * Если не передано — рендерится DefaultToolbarContents.
   */
  toolbarContents?: ReactNode;
  /**
   * Минимальная высота области редактора в пикселях.
   * @default 300
   */
  minHeight?: number;
}

/**
 * Стандартный тулбар для универсального редактора без блог-специфичных элементов.
 * Используется по умолчанию в редакторе заметок клиента и других простых сценариях.
 */
const DefaultToolbarContents = () => (
  <>
    <UndoRedo />
    <Separator />
    <BlockTypeSelect />
    <Separator />
    <BoldItalicUnderlineToggles />
    <Separator />
    <ListsToggle />
    <Separator />
    <CreateLink />
    <InsertTable />
  </>
);

/**
 * Базовый инициализированный MDXEditor компонент.
 *
 * Следует официальному паттерну Next.js App Router для MDXEditor:
 * этот файл помечен `'use client'`, а динамический импорт с `ssr: false`
 * выполняется только в ForwardRefEditor (единственное место).
 *
 * @param props Пропсы редактора, включая управляемое markdown-значение.
 */
export default function InitializedMdxEditor({
  editorRef,
  value,
  onChange,
  onImageUpload,
  placeholder,
  readOnly,
  diffMarkdown,
  toolbarContents,
  minHeight = 300
}: InitializedMdxEditorProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  // markdown prop работает как defaultValue — передаётся только при монтировании
  const [initialMarkdown] = useState(value);
  const lastValueRef = useRef(value);

  // Внутренний ref для setMarkdown — объединяется с внешним editorRef через handleEditorRef
  const internalRef = useRef<MDXEditorMethods | null>(null);

  /**
   * Объединяет внутренний ref с внешним forwardRef-ом.
   * Поддерживает оба формата: callback-ref и объектный ref.
   */
  const handleEditorRef = useCallback(
    (instance: MDXEditorMethods | null) => {
      internalRef.current = instance;

      if (!editorRef) {
        return;
      }

      if (typeof editorRef === 'function') {
        editorRef(instance);
        return;
      }

      // Для объектного ref необходимо обновить .current.
      // Используем Object.assign чтобы не нарушать eslint no-param-reassign.
      Object.assign(editorRef, { current: instance });
    },
    [editorRef]
  );

  // Синхронизация внешнего value → setMarkdown (только при реальном изменении контента)
  useEffect(() => {
    if (internalRef.current && value !== lastValueRef.current) {
      internalRef.current.setMarkdown(value);
      lastValueRef.current = value;
    }
  }, [value]);

  const handleChange = useCallback(
    (v: string) => {
      lastValueRef.current = v;
      onChange(v);
    },
    [onChange]
  );

  const plugins = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    imagePlugin({
      imageUploadHandler: onImageUpload
        ? async image => {
            const url = await onImageUpload(image);
            return url;
          }
        : undefined,
      imageAutocompleteSuggestions: []
    }),
    tablePlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
    codeMirrorPlugin({ codeBlockLanguages: CODE_BLOCK_LANGUAGES }),
    // diffSourcePlugin подключается только если diffMarkdown передан — экономит бандл
    ...(diffMarkdown !== undefined
      ? [diffSourcePlugin({ diffMarkdown: diffMarkdown || value })]
      : []),
    toolbarPlugin({
      // toolbarContents — функция, вызывается внутри MDXEditor-контекста.
      // Это гарантирует корректную работу хуков useCellValues/usePublisher в PortalDiffToggle.
      toolbarContents: () => toolbarContents ?? <DefaultToolbarContents />
    })
  ];

  return (
    <div
      data-editor-theme={dark ? 'dark' : 'light'}
      // Передаём minHeight через CSS-переменную чтобы CSS-правила .mdx-editor-content
      // могли переопределить min-height от пропса без hard-code в CSS
      style={{ '--mdx-editor-min-height': `${minHeight}px` } as React.CSSProperties}
      className={`mdx-editor-container mdx-editor-mobile-optimized ${dark ? 'dark-theme darkEditor' : ''}`}
    >
      <MDXEditor
        ref={handleEditorRef}
        markdown={initialMarkdown}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder}
        contentEditableClassName="mdx-editor-content blog-article"
        className={dark ? 'dark-theme' : ''}
        plugins={plugins}
      />
    </div>
  );
}
