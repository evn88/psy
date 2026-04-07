import { useCallback, useEffect, useState } from 'react';

interface UseBlogEditorLockParams {
  postId: string;
}

interface BlogEditorLockResponse {
  isLockedByOther: boolean;
  owner: {
    userId: string;
    userName: string;
  } | null;
  ttlMs: number;
}

const BLOG_EDITOR_LOCK_HEARTBEAT_MS = 5_000;

/**
 * Управляет клиентской синхронизацией блокировки редактора статьи.
 *
 * @param params Идентификатор статьи.
 * @returns Состояние блокировки и идентификатор текущего экземпляра редактора.
 */
export const useBlogEditorLock = ({ postId }: UseBlogEditorLockParams) => {
  const [editorInstanceId] = useState(() => globalThis.crypto.randomUUID());
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  const heartbeat = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/blog/${postId}/editing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: editorInstanceId
        })
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as BlogEditorLockResponse;

      setIsLockedByOther(payload.isLockedByOther);
      setOwnerName(payload.isLockedByOther ? (payload.owner?.userName ?? null) : null);
    } catch {
      return;
    }
  }, [editorInstanceId, postId]);

  useEffect(() => {
    const initialHeartbeatTimeoutId = globalThis.setTimeout(() => {
      void heartbeat();
    }, 0);

    const intervalId = globalThis.setInterval(() => {
      void heartbeat();
    }, BLOG_EDITOR_LOCK_HEARTBEAT_MS);
    const currentInstanceId = editorInstanceId;

    return () => {
      globalThis.clearTimeout(initialHeartbeatTimeoutId);
      globalThis.clearInterval(intervalId);

      void fetch(`/api/admin/blog/${postId}/editing`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: currentInstanceId
        }),
        keepalive: true
      }).catch(() => undefined);
    };
  }, [editorInstanceId, heartbeat, postId]);

  return {
    editorInstanceId,
    isLockedByOther,
    ownerName
  };
};
