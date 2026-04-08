'use client';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertImage,
  InsertTable,
  ListsToggle,
  type MDXEditorMethods,
  Separator,
  UndoRedo,
  useCellValues,
  usePublisher,
  viewMode$
} from '@mdxeditor/editor';
import { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ForwardRefEditor } from '@/shared/ui/mdx-editor';
import type { ForwardRefEditorProps } from '@/shared/ui/mdx-editor';
/**
 * ID DOM-узла, в который PortalDiffToggle рендерит кнопки переключения режимов.
 * Экспортируется для использования в blog-editor-form.tsx при создании целевого элемента.
 */
export const BLOG_EDITOR_VIEW_MODE_TARGET_ID = 'mdx-editor-view-mode';

/**
 * Пропсы блог-адаптера: полный набор ForwardRefEditorProps
 * плюс блог-специфичный обработчик для ИИ-перевода статьи.
 * toolbarContents исключён — в адаптере формируется автоматически.
 */
interface MdxEditorWrapperProps extends Omit<ForwardRefEditorProps, 'toolbarContents'> {
  onTranslateClick?: () => void;
}

/**
 * Портал-переключатель режимов редактора (Diff/Source/Rich Text).
 *
 * Рендерится как часть тулбара MDXEditor, но через React Portal прокидывает
 * кнопки в DOM-узел с id BLOG_EDITOR_VIEW_MODE_TARGET_ID (в строке языковых табов).
 * Использует useCellValues/usePublisher — эти хуки работают только внутри
 * MDXEditor-контекста, поэтому компонент должен вызываться из toolbarContents-функции.
 */
const PortalDiffToggle = () => {
  const tMdx = useTranslations('Admin.blog.editor.mdx');
  const [viewMode] = useCellValues(viewMode$);
  const setViewMode = usePublisher(viewMode$);

  const portalTarget =
    typeof document === 'undefined'
      ? null
      : document.getElementById(BLOG_EDITOR_VIEW_MODE_TARGET_ID);

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

/**
 * Тонкий адаптер MDXEditor для блог-редактора.
 *
 * Расширяет базовый ForwardRefEditor двумя блог-специфичными элементами:
 * - PortalDiffToggle — переключатель режимов Diff/Source/Rich Text (портал в языковые табы)
 * - Кнопка запуска ИИ-перевода (рендерится только при наличии onTranslateClick)
 * - InsertImage — загрузка изображений через onImageUpload
 *
 * Вся логика плагинов, синхронизации и темы инкапсулирована в ForwardRefEditor.
 *
 * @param props Пропсы редактора плюс onTranslateClick для ИИ-перевода.
 */
export const MdxEditorWrapper = forwardRef<MDXEditorMethods, MdxEditorWrapperProps>(
  function MdxEditorWrapper({ onTranslateClick, ...editorProps }, ref) {
    const tMdx = useTranslations('Admin.blog.editor.mdx');

    // toolbarContents формируется здесь и передаётся в ForwardRefEditor как пропс.
    // Будет вызван как функция внутри toolbarPlugin — в контексте MDXEditor-провайдеров,
    // что обеспечивает корректную работу useCellValues и usePublisher в PortalDiffToggle.
    const toolbarContents = (
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
      </>
    );

    return <ForwardRefEditor ref={ref} {...editorProps} toolbarContents={toolbarContents} />;
  }
);
