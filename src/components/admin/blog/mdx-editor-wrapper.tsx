'use client';

import '@mdxeditor/editor/style.css';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  codeBlockPlugin,
  codeMirrorPlugin,
  CreateLink,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  InsertImage,
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
  UndoRedo,
  useCellValues,
  usePublisher,
  viewMode$
} from '@mdxeditor/editor';
import { forwardRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface MdxEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  readOnly?: boolean;
  diffMarkdown?: string;
}

// Компонент-портал для переключения режимов (Diff/Source/Rich Text), который рендерится в языковых табах
const PortalDiffToggle = () => {
  const [viewMode] = useCellValues(viewMode$);
  const setViewMode = usePublisher(viewMode$);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const target = document.getElementById('mdx-editor-view-mode');
    // eslint-disable-next-line
    if (target) setPortalTarget(target);
  }, []);

  const toggleButtons = (
    <div className="flex bg-muted/50 rounded-lg p-0.5 border">
      <button
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          viewMode === 'rich-text'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setViewMode('rich-text')}
        type="button"
        title="Визуальный редактор"
      >
        Editor
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          viewMode === 'diff'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setViewMode('diff')}
        type="button"
        title="Сравнение версий"
      >
        Diff
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          viewMode === 'source'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setViewMode('source')}
        type="button"
        title="Исходный код (Markdown)"
      >
        Source
      </button>
    </div>
  );

  if (!portalTarget) return null;
  return createPortal(toggleButtons, portalTarget);
};

export const MdxEditorWrapper = forwardRef<MDXEditorMethods, MdxEditorWrapperProps>(
  function MdxEditorWrapper(
    { value, onChange, onImageUpload, placeholder, readOnly, diffMarkdown },
    ref
  ) {
    const { resolvedTheme } = useTheme();
    const [localDark, setLocalDark] = useState<boolean | null>(null);
    const dark = localDark ?? resolvedTheme === 'dark';

    // Применяем классы темы MDXEditor к body, чтобы всплывающие окна (Portals)
    // получали правильные CSS переменные тёмной темы.
    useEffect(() => {
      if (dark) {
        document.body.classList.add('dark-theme', 'darkEditor');
      } else {
        document.body.classList.remove('dark-theme', 'darkEditor');
      }
      return () => document.body.classList.remove('dark-theme', 'darkEditor');
    }, [dark]);

    return (
      <div
        data-editor-theme={dark ? 'dark' : 'light'}
        className={`mdx-editor-container mdx-editor-mobile-optimized ${dark ? 'dark-theme darkEditor' : ''}`}
      >
        <MDXEditor
          ref={ref}
          markdown={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          contentEditableClassName="mdx-editor-content"
          className={dark ? 'dark-theme darkEditor' : ''}
          plugins={[
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
            codeMirrorPlugin({
              codeBlockLanguages: {
                js: 'JavaScript',
                ts: 'TypeScript',
                tsx: 'TSX',
                jsx: 'JSX',
                css: 'CSS',
                bash: 'Bash',
                sh: 'Shell',
                json: 'JSON',
                text: 'Текст'
              }
            }),
            diffSourcePlugin({ diffMarkdown: diffMarkdown || value }),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <PortalDiffToggle />
                  <UndoRedo />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <Separator />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <Separator />
                  <InsertTable />

                  <div className="mdx-toolbar-spacer" />
                  <button
                    type="button"
                    onClick={() => setLocalDark(!dark)}
                    className="mdx-editor-theme-toggle"
                    title={dark ? 'Светлая тема' : 'Тёмная тема'}
                  >
                    {dark ? <Sun size={14} /> : <Moon size={14} />}
                  </button>
                </>
              )
            })
          ]}
        />
      </div>
    );
  }
);
