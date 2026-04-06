import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Globe, Languages, Loader2, Save } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormValues } from './blog-editor.schema';

interface BlogEditorTopBarProps {
  isPending: boolean;
  publish: () => void;
  save: (showToast?: boolean, createVersion?: boolean) => void;
  setShowTranslateModal: (show: boolean) => void;
}

export function BlogEditorTopBar({
  isPending,
  publish,
  save,
  setShowTranslateModal
}: BlogEditorTopBarProps) {
  const { control, setValue } = useFormContext<FormValues>();
  const status = useWatch({ control, name: 'status' });
  const translations = useWatch({ control, name: 'translations' });
  const activeTranslation = translations.find(t => t.title.trim().length > 0) ?? translations[0];

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur-sm sm:py-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pr-4 -mr-4 sm:mr-0 sm:pr-0">
        <Select
          value={status}
          onValueChange={v => setValue('status', v as 'DRAFT' | 'PUBLISHED', { shouldDirty: true })}
        >
          <SelectTrigger className="w-[130px] h-9 text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                Черновик
              </span>
            </SelectItem>
            <SelectItem value="PUBLISHED">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Опубликовано
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTranslateModal(true)}
          className="h-9 px-2 sm:px-3 text-[#900A0B] border-[#900A0B]/20 hover:bg-[#900A0B]/5"
        >
          <Languages className="size-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Перевести</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {status !== 'PUBLISHED' && (
          <Button
            size="sm"
            onClick={publish}
            disabled={isPending || !activeTranslation?.title}
            className="h-9 bg-[#900A0B] hover:bg-[#900A0B]/90 text-white shadow-sm"
          >
            {isPending ? '...' : <span className="hidden sm:inline">Опубликовать</span>}
            {!isPending && <Globe className="size-4 sm:ml-1.5" />}
          </Button>
        )}

        <Button
          size="sm"
          onClick={() => save(true, true)}
          disabled={isPending}
          variant="default"
          className="h-9 bg-[#03070A] hover:bg-[#03070A]/90 text-white"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4 sm:mr-1.5" />
          )}
          <span className="hidden sm:inline">{isPending ? 'Сохранение...' : 'Сохранить'}</span>
        </Button>
      </div>
    </div>
  );
}
