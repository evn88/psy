'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { SortableWidget } from './sortable-widget';
import { Button } from '@/components/ui/button';
import { Save, Edit3, X, RefreshCcw, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { animate, stagger } from 'animejs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export interface WidgetConfig {
  id: string;
  type: string;
}

export type WidgetComponentType = React.FC<any> & { defaultClassName?: string };

interface DashboardGridProps {
  initialLayout?: WidgetConfig[] | null;
  storageKey?: string;
  availableWidgets: Record<string, WidgetComponentType>;
  widgetLabels?: Record<string, string>;
  onSave?: (layout: WidgetConfig[]) => Promise<void>;
  defaultLayout: WidgetConfig[];
  data: any;
}

export function DashboardGrid({
  initialLayout,
  storageKey,
  availableWidgets,
  widgetLabels,
  onSave,
  defaultLayout,
  data
}: DashboardGridProps) {
  const t = useTranslations('DashboardGrid');
  const [layout, setLayout] = useState<WidgetConfig[]>(defaultLayout);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalLayout, setOriginalLayout] = useState<WidgetConfig[] | null>(null);

  const initialLayoutStr = initialLayout !== undefined ? JSON.stringify(initialLayout) : undefined;

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            setLayout(parsed);
            setIsLoaded(true);
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved layout from localStorage');
        }
      }
      setLayout(defaultLayout);
    } else if (initialLayoutStr !== undefined && !isEditing) {
      const parsedLayout = JSON.parse(initialLayoutStr);
      setLayout(parsedLayout && parsedLayout.length > 0 ? parsedLayout : defaultLayout);
    }
    setIsLoaded(true);
    // We intentionally only depend on the stringified layout and storageKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLayoutStr, storageKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isEditing) {
      animate('.widget-wrapper', {
        scale: [0.98, 1],
        opacity: [0.8, 1],
        duration: 300,
        ease: 'outQuart',
        delay: stagger(40)
      });
    }
  }, [isEditing]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOriginalLayout(layout);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout((items: WidgetConfig[]) => {
        const oldIndex = items.findIndex((i: WidgetConfig) => i.id === active.id);
        const newIndex = items.findIndex((i: WidgetConfig) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEnd = () => {
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    if (originalLayout) setLayout(originalLayout);
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    }
    if (onSave) {
      await onSave(layout);
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  const removeWidget = (id: string) => {
    setLayout(layout.filter((w: WidgetConfig) => w.id !== id));
  };

  const resetLayout = () => {
    setLayout(defaultLayout);
  };

  const addWidget = (type: string) => {
    setLayout([...layout, { id: Math.random().toString(36).substring(7), type }]);
  };

  const availableWidgetKeys = Object.keys(availableWidgets);
  const usedWidgetKeys = layout.map((w: WidgetConfig) => w.type);
  const unusedWidgetKeys = availableWidgetKeys.filter(k => !usedWidgetKeys.includes(k));

  const activeWidget = activeId ? layout.find((w: WidgetConfig) => w.id === activeId) : null;
  const ActiveWidgetComponent = activeWidget ? availableWidgets[activeWidget.type] : null;

  if (!isLoaded) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-min opacity-50 pointer-events-none">
        {defaultLayout.map((w, idx) => (
          <div key={idx} className="h-48 w-full bg-muted/20 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 mb-4">
        {isEditing ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shadow-sm border-dashed border-primary/50 text-primary hover:bg-primary/5"
                >
                  <Plus className="w-4 h-4 mr-2" /> {t('add') || 'Добавить виджет'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {unusedWidgetKeys.length === 0 ? (
                  <DropdownMenuItem disabled>
                    {t('noWidgets') || 'Нет доступных виджетов'}
                  </DropdownMenuItem>
                ) : (
                  unusedWidgetKeys.map(key => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => addWidget(key)}
                      className="cursor-pointer"
                    >
                      {widgetLabels?.[key] || key}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={resetLayout} size="sm" className="shadow-sm">
              <RefreshCcw className="w-4 h-4 mr-2" /> {t('reset') || 'Reset'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                if (originalLayout) setLayout(originalLayout);
              }}
              size="sm"
              disabled={isSaving}
              className="shadow-sm"
            >
              <X className="w-4 h-4 mr-2" /> {t('cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSave} size="sm" disabled={isSaving} className="shadow-sm">
              <Save className="w-4 h-4 mr-2" />{' '}
              {isSaving ? t('saving') || 'Saving...' : t('save') || 'Save'}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            size="sm"
            className="shadow-sm hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <Edit3 className="w-4 h-4 mr-2 text-primary" /> {t('edit') || 'Edit Dashboard'}
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={layout.map((i: WidgetConfig, idx: number) => i.id || `fallback-${idx}-${i.type}`)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-min">
            {layout.map((widget: WidgetConfig, index: number) => {
              const WidgetComponent = availableWidgets[widget.type];
              if (!WidgetComponent) return null;

              const widgetId = widget.id || `fallback-${index}-${widget.type}`;

              return (
                <SortableWidget
                  key={widgetId}
                  id={widgetId}
                  isEditing={isEditing}
                  onRemove={() => removeWidget(widgetId)}
                  className={WidgetComponent.defaultClassName}
                >
                  <WidgetComponent isEditing={isEditing} data={data} />
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
          }}
        >
          {activeWidget && ActiveWidgetComponent ? (
            <div
              className={cn(
                'widget-wrapper scale-105 opacity-90 shadow-2xl ring-2 ring-primary/40 rounded-xl',
                ActiveWidgetComponent.defaultClassName
              )}
            >
              <ActiveWidgetComponent isEditing={isEditing} data={data} isOverlay={true} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
