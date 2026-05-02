interface BlogEditorLockRecord {
  instanceId: string;
  userId: string;
  userName: string;
  touchedAt: number;
}

interface BlogEditorLockState {
  isOwner: boolean;
  owner: BlogEditorLockRecord | null;
}

const BLOG_EDITOR_LOCK_TTL_MS = 15_000;

/**
 * Возвращает глобальное хранилище активных блокировок редактора.
 *
 * @returns Map блокировок по идентификатору статьи.
 */
const getBlogEditorLockStore = () => {
  const globalState = globalThis as typeof globalThis & {
    __blogEditorLocks?: Map<string, BlogEditorLockRecord>;
  };

  if (!globalState.__blogEditorLocks) {
    globalState.__blogEditorLocks = new Map<string, BlogEditorLockRecord>();
  }

  return globalState.__blogEditorLocks;
};

/**
 * Удаляет протухшие блокировки из in-memory хранилища.
 */
const pruneExpiredBlogEditorLocks = () => {
  const now = Date.now();
  const store = getBlogEditorLockStore();

  for (const [postId, lock] of store.entries()) {
    if (now - lock.touchedAt > BLOG_EDITOR_LOCK_TTL_MS) {
      store.delete(postId);
    }
  }
};

/**
 * Пытается получить или продлить блокировку редактора статьи.
 *
 * @param params Идентификаторы статьи и экземпляра редактора, а также данные пользователя.
 * @returns Состояние владения блокировкой и текущий владелец.
 */
export const acquireBlogEditorLock = ({
  postId,
  instanceId,
  userId,
  userName
}: {
  postId: string;
  instanceId: string;
  userId: string;
  userName: string;
}): BlogEditorLockState => {
  pruneExpiredBlogEditorLocks();

  const store = getBlogEditorLockStore();
  const existingLock = store.get(postId);

  if (!existingLock || existingLock.instanceId === instanceId) {
    const nextLock: BlogEditorLockRecord = {
      instanceId,
      userId,
      userName,
      touchedAt: Date.now()
    };

    store.set(postId, nextLock);

    return {
      isOwner: true,
      owner: nextLock
    };
  }

  return {
    isOwner: false,
    owner: existingLock
  };
};

/**
 * Возвращает состояние блокировки редактора для текущего экземпляра.
 *
 * @param postId Идентификатор статьи.
 * @param instanceId Идентификатор экземпляра редактора.
 * @returns Состояние владения блокировкой и текущий владелец.
 */
export const getBlogEditorLockState = (postId: string, instanceId: string): BlogEditorLockState => {
  pruneExpiredBlogEditorLocks();

  const existingLock = getBlogEditorLockStore().get(postId) ?? null;

  if (!existingLock) {
    return {
      isOwner: false,
      owner: null
    };
  }

  return {
    isOwner: existingLock.instanceId === instanceId,
    owner: existingLock
  };
};

/**
 * Освобождает блокировку редактора, если её снимает текущий владелец.
 *
 * @param postId Идентификатор статьи.
 * @param instanceId Идентификатор экземпляра редактора.
 */
export const releaseBlogEditorLock = (postId: string, instanceId: string) => {
  pruneExpiredBlogEditorLocks();

  const store = getBlogEditorLockStore();
  const existingLock = store.get(postId);

  if (existingLock?.instanceId === instanceId) {
    store.delete(postId);
  }
};

export { BLOG_EDITOR_LOCK_TTL_MS };
