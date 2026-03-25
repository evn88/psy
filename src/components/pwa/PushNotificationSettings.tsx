'use client';

import { Bell, BellOff, BellRing, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Блок управления push-уведомлениями в настройках пользователя.
 * Показывает текущий статус и позволяет включить/отключить подписку.
 */
export function PushNotificationSettings() {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Push-уведомления
          </CardTitle>
          <CardDescription>
            Ваш браузер или устройство не поддерживает push-уведомления.
            На iOS убедитесь, что сайт добавлен на экран «Домой» и используется Safari 16.4+.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="h-4 w-4 text-destructive" />
            Push-уведомления заблокированы
          </CardTitle>
          <CardDescription>
            Вы ранее отклонили запрос на уведомления. Чтобы снова включить их, измените
            разрешение вручную в настройках браузера:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Chrome / Edge</p>
            <p>
              Нажмите на замок (🔒) в адресной строке → Уведомления → Разрешить → обновите
              страницу.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Safari (iOS, добавлено на экран)</p>
            <p>Настройки → Приложения → Safari → Уведомления → Разрешить для vershkov.com.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Firefox</p>
            <p>Нажмите на значок замка рядом с адресом → Разрешения → Уведомления → Разрешить.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => window.open('https://support.google.com/chrome/answer/3220216', '_blank')}
          >
            <ExternalLink className="mr-2 h-3 w-3" />
            Подробная инструкция
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4" />
            Push-уведомления
          </CardTitle>
          {isSubscribed && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 hover:bg-green-100/80"
            >
              Включены
            </Badge>
          )}
        </div>
        <CardDescription>
          {isSubscribed
            ? 'Вы будете получать уведомления о новых сессиях и важных событиях.'
            : 'Включите уведомления, чтобы не пропустить информацию о сессиях.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSubscribed ? (
          <Button variant="outline" size="sm" onClick={unsubscribe}>
            <BellOff className="mr-2 h-4 w-4" />
            Отключить уведомления
          </Button>
        ) : (
          <Button size="sm" onClick={subscribe}>
            <Bell className="mr-2 h-4 w-4" />
            Включить уведомления
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
