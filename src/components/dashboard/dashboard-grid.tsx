'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { WidgetConfig } from '@/lib/dashboard-config';
import type { WorkflowBudgetSnapshot } from '@/lib/workflow-budget';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface DashboardWidgetData {
  userCount?: number;
  activeSessionsCount?: number;
  waitingUsersCount?: number;
  upcomingSlotsCount?: number;
  scheduledHoursThisWeek?: number;
  bookedUsersCount?: number;
  freeHours?: number;
  cancelledEventsCount?: number;
  currentMonthPaymentsTotal?: number;
  paymentsYearlySeries?: Array<{ monthKey: string; monthLabel: string; total: number }>;
  paymentsCurrency?: string;
  workflowBudgetSnapshot?: WorkflowBudgetSnapshot;
  newUsersCount?: number;
  systemErrorsCount?: number;
  paymentDisputesCount?: number;
  completedSurveysCount?: number;
  pendingSurveys?: number;
  completedSurveys?: number;
  nextSessionTitle?: string | null;
  nextSessionStart?: string | null;
  userTimezone?: string;
  userLanguage?: string;
  userName?: string;
  userEmail?: string;
  balance?: number;
  filesCount?: number;
  userId?: string;
}

interface WidgetComponentProps {
  data?: DashboardWidgetData;
  isEditing?: boolean;
  isOverlay?: boolean;
}

export type WidgetComponentType = React.FC<WidgetComponentProps> & { defaultClassName?: string };

interface DashboardGridProps {
  initialLayout?: WidgetConfig[] | null;
  availableWidgets: Record<string, WidgetComponentType>;
  widgetLabels?: Record<string, string>;
  onSave?: (layout: WidgetConfig[]) => Promise<unknown>;
  defaultLayout: WidgetConfig[];
  data?: DashboardWidgetData;
}

export function DashboardGrid({
  initialLayout,
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preDragLayout, setPreDragLayout] = useState<WidgetConfig[] | null>(null);
  const [preEditLayout, setPreEditLayout] = useState<WidgetConfig[] | null>(null);

  useEffect(() => {
    if (initialLayout !== undefined) {
      setLayout(initialLayout ?? defaultLayout);
      setIsLoaded(true);
    }
  }, [defaultLayout, initialLayout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setPreDragLayout(layout);
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
    setPreDragLayout(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    if (preDragLayout) setLayout(preDragLayout);
    setPreDragLayout(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave?.(layout);
      setPreEditLayout(null);
      setIsEditing(false);
    } catch {
      setSaveError(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (preEditLayout) setLayout(preEditLayout);
    setPreEditLayout(null);
  };

  const removeWidget = (id: string) => {
    setLayout(layout.filter((w: WidgetConfig) => w.id !== id));
  };

  const resetLayout = () => {
    setLayout(defaultLayout);
  };

  const addWidget = (type: string) => {
    setLayout([...layout, { id: crypto.randomUUID(), type }]);
  };

  const availableWidgetKeys = Object.keys(availableWidgets);
  const usedWidgetKeys = layout.map((w: WidgetConfig) => w.type);
  const unusedWidgetKeys = availableWidgetKeys.filter(k => !usedWidgetKeys.includes(k));

  const activeWidget = activeId ? layout.find((w: WidgetConfig) => w.id === activeId) : null;
  const ActiveWidgetComponent = activeWidget ? availableWidgets[activeWidget.type] : null;

  if (!isLoaded) {
    return (
      <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {defaultLayout.map(widget => (
          <div key={widget.id} className="h-48 w-full animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        {isEditing ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-10 border-primary/30 text-primary shadow-none hover:bg-primary/5"
                >
                  <Plus className="size-4" /> {t('add')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {unusedWidgetKeys.length === 0 ? (
                  <DropdownMenuItem disabled>{t('noWidgets')}</DropdownMenuItem>
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
            <Button
              variant="outline"
              onClick={resetLayout}
              size="sm"
              className="min-h-10 shadow-none"
            >
              <RefreshCcw className="size-4" /> {t('reset')}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              size="sm"
              disabled={isSaving}
              className="min-h-10 shadow-none"
            >
              <X className="size-4" /> {t('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={isSaving}
              className="min-h-10 shadow-none"
            >
              <Save className="size-4" /> {isSaving ? t('saving') : t('save')}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setPreEditLayout(layout);
              setIsEditing(true);
            }}
            size="sm"
            className="min-h-10 shadow-none transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <Edit3 className="size-4 text-primary" /> {t('edit')}
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
          <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  dragLabel={t('moveWidget')}
                  removeLabel={t('removeWidget')}
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
                'widget-wrapper scale-[1.02] rounded-xl opacity-95 shadow-lg ring-2 ring-primary/30',
                ActiveWidgetComponent.defaultClassName
              )}
            >
              <ActiveWidgetComponent isEditing={isEditing} data={data} isOverlay={true} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
