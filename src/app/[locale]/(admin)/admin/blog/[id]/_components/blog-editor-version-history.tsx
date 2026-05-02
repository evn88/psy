import { useLocale, useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import type { BlogEditorVersion } from './blog-editor-form.types';

interface BlogEditorVersionHistoryProps {
  versions: BlogEditorVersion[];
  selectedDiffVersionId: string | null;
  restoringVersion: boolean;
  onSelectVersion: (versionId: string | null) => void;
  onRestoreVersion: (version: BlogEditorVersion) => void;
}

/**
 * Возвращает подпись версии для списка истории.
 *
 * @param index Индекс версии в отображаемом списке.
 * @param latestLabel Подпись для последней версии.
 * @param titleFormatter Форматтер названия версии.
 * @returns Название версии для интерфейса.
 */
const getVersionTitle = (
  index: number,
  latestLabel: string,
  titleFormatter: (versionNumber: number) => string
) => {
  return index === 0 ? latestLabel : titleFormatter(index + 1);
};

/**
 * Форматирует дату сохранения версии для боковой панели.
 *
 * @param savedAt ISO-строка времени сохранения.
 * @param locale Локаль интерфейса.
 * @returns Локализованную подпись даты.
 */
const formatSavedAt = (savedAt: string, locale: string) => {
  return new Date(savedAt).toLocaleString(locale === 'sr' ? 'sr-RS' : locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Отображает историю версий редактора статьи.
 *
 * @param props Данные версий и обработчики выбора и восстановления.
 * @returns Блок истории версий.
 */
export const BlogEditorVersionHistory = ({
  versions,
  selectedDiffVersionId,
  restoringVersion,
  onSelectVersion,
  onRestoreVersion
}: BlogEditorVersionHistoryProps) => {
  const locale = useLocale();
  const tSidebar = useTranslations('Admin.blog.editor.sidebar');

  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed">{tSidebar('versionsEmpty')}</p>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => onSelectVersion(null)}
        className={`w-full rounded-lg border p-2 text-left transition-all ${
          selectedDiffVersionId === null
            ? 'bg-[#900A0B]/5 border-[#900A0B]/30'
            : 'bg-background/50 border-border/40 hover:border-border'
        }`}
      >
        <span
          className={`block text-xs font-medium ${
            selectedDiffVersionId === null ? 'text-[#900A0B]' : 'text-foreground'
          }`}
        >
          {tSidebar('currentDraftTitle')}
        </span>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">
          {tSidebar('currentDraftDescription')}
        </span>
      </button>

      {versions.map((version, index) => {
        const isSelected = selectedDiffVersionId === version.id;

        return (
          <div
            key={version.id}
            className={`flex items-center gap-2 rounded-lg border p-2 transition-all ${
              isSelected
                ? 'bg-[#900A0B]/5 border-[#900A0B]/30'
                : 'bg-background/50 border-border/40 hover:border-border'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectVersion(version.id)}
              className="flex-1 text-left"
            >
              <span
                className={`block text-xs font-medium ${
                  isSelected ? 'text-[#900A0B]' : 'text-foreground'
                }`}
              >
                {getVersionTitle(index, tSidebar('latestVersion'), versionNumber =>
                  tSidebar('versionTitle', { number: versionNumber })
                )}
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {formatSavedAt(version.savedAt, locale)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRestoreVersion(version)}
              disabled={restoringVersion}
              className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-[#900A0B] hover:bg-[#900A0B]/10"
              title={tSidebar('restoreVersion')}
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
