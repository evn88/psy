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
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/components/theme-provider';

interface MdxEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  readOnly?: boolean;
  diffMarkdown?: string;
  onTranslateClick?: () => void;
}

const MDX_EDITOR_VIEW_MODE_TARGET_ID = 'mdx-editor-view-mode';

// Компонент-портал для переключения режимов (Diff/Source/Rich Text), который рендерится в языковых табах
const PortalDiffToggle = () => {
  const tMdx = useTranslations('Admin.blog.editor.mdx');
  const [viewMode] = useCellValues(viewMode$);
  const setViewMode = usePublisher(viewMode$);
  const portalTarget =
    typeof document === 'undefined'
      ? null
      : document.getElementById(MDX_EDITOR_VIEW_MODE_TARGET_ID);

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
        title={tMdx('richTextTitle')}
      >
        {tMdx('richText')}
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          viewMode === 'diff'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setViewMode('diff')}
        type="button"
        title={tMdx('diffTitle')}
      >
        {tMdx('diff')}
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          viewMode === 'source'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => setViewMode('source')}
        type="button"
        title={tMdx('sourceTitle')}
      >
        {tMdx('source')}
      </button>
    </div>
  );

  if (!portalTarget) return null;
  return createPortal(toggleButtons, portalTarget);
};

export const MdxEditorWrapper = forwardRef<MDXEditorMethods | null, MdxEditorWrapperProps>(
  function MdxEditorWrapper(
    { value, onChange, onImageUpload, placeholder, readOnly, diffMarkdown, onTranslateClick },
    ref
  ) {
    const tMdx = useTranslations('Admin.blog.editor.mdx');
    const { resolvedTheme } = useTheme();
    const [localDark, setLocalDark] = useState<boolean | null>(null);
    const dark = localDark ?? resolvedTheme === 'dark';

    const editorRef = useRef<MDXEditorMethods | null>(null);
    const handleEditorRef = useCallback(
      (instance: MDXEditorMethods | null) => {
        editorRef.current = instance;

        if (!ref) {
          return;
        }

        if (typeof ref === 'function') {
          ref(instance);
          return;
        }

        ref.current = instance;
      },
      [ref]
    );

    const [initialMarkdown] = useState(value);
    const lastValueRef = useRef(value);

    useEffect(() => {
      if (editorRef.current && value !== lastValueRef.current) {
        editorRef.current.setMarkdown(value);
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

    // Применяем классы темы MDXEditor к body
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
          ref={handleEditorRef}
          markdown={initialMarkdown}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
          contentEditableClassName="mdx-editor-content blog-article"
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
                text: tMdx('textLanguage')
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
                  {onTranslateClick && (
                    <>
                      <Separator />
                      <button
                        type="button"
                        onClick={onTranslateClick}
                        className="mdx-editor-theme-toggle"
                        title={tMdx('translateArticle')}
                      >
                        <Languages size={14} />
                      </button>
                    </>
                  )}

                  <div className="mdx-toolbar-spacer" />
                  <button
                    type="button"
                    onClick={() => setLocalDark(!dark)}
                    className="mdx-editor-theme-toggle"
                    title={dark ? tMdx('lightTheme') : tMdx('darkTheme')}
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
