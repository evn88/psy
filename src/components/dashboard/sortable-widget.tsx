'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SortableWidgetProps {
  id: string;
  isEditing: boolean;
  onRemove: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SortableWidget({
  id,
  isEditing,
  onRemove,
  children,
  className
}: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'widget-wrapper relative group h-full',
        className,
        isEditing && 'ring-2 ring-primary/20 rounded-xl',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-md p-1 rounded-lg shadow-sm border border-border/50">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted rounded-md transition-colors"
          >
            <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={onRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className={cn('h-full', isEditing && 'pointer-events-none opacity-90')}>{children}</div>
    </div>
  );
}
