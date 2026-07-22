'use client';

import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';

interface EmailTemplateCodeEditorProps {
  language: 'html' | 'css';
  label: string;
  value: string;
  minHeight: string;
  placeholder?: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

/** Редактор исходного кода шаблона с подсветкой, поиском и автозакрытием конструкций. */
export const EmailTemplateCodeEditor = ({
  language,
  label,
  value,
  minHeight,
  placeholder,
  onBlur,
  onChange
}: EmailTemplateCodeEditorProps) => {
  const { resolvedTheme } = useTheme();
  const extensions = [language === 'html' ? html() : css(), EditorView.lineWrapping];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-background shadow-sm transition-shadow duration-150',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20'
      )}
    >
      <CodeMirror
        aria-label={label}
        value={value}
        height={minHeight}
        minHeight={minHeight}
        placeholder={placeholder}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        extensions={extensions}
        basicSetup={{
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          lineNumbers: true,
          searchKeymap: true
        }}
        className="text-[13px] [&_.cm-content]:font-mono [&_.cm-content]:leading-6 [&_.cm-editor]:bg-transparent [&_.cm-focused]:outline-none [&_.cm-gutters]:border-r [&_.cm-gutters]:border-border [&_.cm-gutters]:bg-muted/40"
        onBlur={onBlur}
        onChange={onChange}
      />
    </div>
  );
};
