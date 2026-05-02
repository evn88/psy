import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Отображает пустое состояние раздела.
 * @param props - иконка, заголовок и текст.
 * @returns Карточка пустого состояния.
 */
export const EmptyState = ({
  icon: Icon,
  text,
  title
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) => {
  return (
    <Card className="rounded-[1.5rem] border-dashed border-white/60 bg-transparent py-8 shadow-none dark:border-white/10">
      <CardContent className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <Icon className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">{title}</h3>
        <p className="max-w-[240px] text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
};
