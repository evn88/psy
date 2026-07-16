export const appNotificationKinds = ['INFO', 'WARNING', 'SUCCESS'] as const;

export type AppNotificationKind = (typeof appNotificationKinds)[number];

export interface AppNotificationDto {
  id: string;
  kind: AppNotificationKind;
  source: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string;
}

export interface AppNotificationHistoryDto extends AppNotificationDto {
  readAt: string | null;
  dismissedAt: string | null;
}

export interface AppNotificationHistoryPage {
  items: AppNotificationHistoryDto[];
  nextCursor: string | null;
}

export interface CreateNotificationContent {
  kind?: AppNotificationKind;
  source: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
}

export interface UseNotificationsResult {
  notifications: AppNotificationDto[];
  unreadCount: number;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}
