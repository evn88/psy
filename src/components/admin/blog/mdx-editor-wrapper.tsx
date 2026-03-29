'use client';

import '@mdxeditor/editor/style.css';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  CreateLink,
  Separator,
  CodeToggle,
  DiffSourceToggleWrapper,
  type MDXEditorMethods
} from '@mdxeditor/editor';
import { forwardRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface MdxEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  readOnly?: boolean;
}

export const MdxEditorWrapper = forwardRef<MDXEditorMethods, MdxEditorWrapperProps>(
  function MdxEditorWrapper({ value, onChange, onImageUpload, placeholder, readOnly }, ref) {
    const { resolvedTheme } = useTheme();
    // Локальное переопределение темы для редактора
    const [localDark, setLocalDark] = useState<boolean | null>(null);

    // Итоговая тема
    const dark = localDark ?? resolvedTheme === 'dark';

    return (
      <div data-editor-theme={dark ? 'dark' : 'light'} className="mdx-editor-container">
        <MDXEditor
          ref={ref}
          markdown={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          contentEditableClassName="mdx-editor-content"
          className={dark ? 'dark' : ''}
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
            diffSourcePlugin({ viewMode: 'rich-text' }),
            toolbarPlugin({
              toolbarContents: () => (
                <DiffSourceToggleWrapper>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertThematicBreak />
                  <div className="mdx-toolbar-spacer" />
                  <button
                    type="button"
                    onClick={() => setLocalDark(!dark)}
                    className="mdx-editor-theme-toggle"
                    title={dark ? 'Светлая тема' : 'Тёмная тема'}
                  >
                    {dark ? <Sun size={14} /> : <Moon size={14} />}
                  </button>
                </DiffSourceToggleWrapper>
              )
            })
          ]}
        />
      </div>
    );
  }
);
