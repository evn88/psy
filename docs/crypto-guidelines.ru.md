# Руководство по безопасности: Шифрование данных уровней БД и выдача цифровых подписей (HMAC)

Этот гайд описывает, как разработчики могут использовать встроенные в платформу утилиты криптографии для защиты пользовательских данных и генерации доказуемых отпечатков (сигнатур) на сервере без участия пользователя.
Файл утилит находится по пути: `src/shared/lib/crypto.ts`

> [!WARNING]
> Это серверный модуль. Он не должен быть использован в клиентских компонентах поверх браузера, поскольку это раскроет системный `ENCRYPTION_KEY`. Используйте эти утилиты исключительно в `Server Actions` или `Route Handlers`. В идеале, применять директиву `import "server-only";` внутри файла.

## 1. Шифрование на уровне приложения (AES-256-GCM)

Шифрование данных перед записью в Prisma обеспечивает второй слой защиты (сверх шифрования диска провайдера). Даже если кто-то получит доступ к дампу БД, конфиденциальные данные (в виде строк или JSON) будут состоять из непрочитанного `iv:cipher:authTag` потока.

### Как настроить ключ шифрования

Вы должны объявить переменную окружения в `.env` (и `.env.test` и Vercel Secrets):

```env
# Требуется 32-битная случайная строка (64 HEX символа). 
# Сгенерируйте с помощью команды: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=...
```

### Как использовать

В серверной экшене, перед записью в базу:

```typescript
import { encryptData, decryptData } from "@/shared/lib/crypto";

// Шифрование JSON объектов или строк
const privateAnswers = { "diagnosis": "PTSD", "request": "Burnout" };
const encryptedString = encryptData(JSON.stringify(privateAnswers));

// Сохраняем в бд (сохранится как бессмысленный текст)
await prisma.intakeResponse.create({
  data: {
    answers: encryptedString, 
    // ...
  }
})

// При чтении
const record = await prisma.intakeResponse.findUnique({ where: { id }});
const decryptedObject = JSON.parse(decryptData(record.answers));
```

## 2. Генерирование "Скрытой" Цифровой Подписи Согласия (HMAC SHA-256)

Иногда нужно доказать факт того, что `userId` дал согласие. Если галочка сохраняется в БД просто как `boolean = true`, это легко подсовывается вручную. 
Генерация HMAC хеша поверх уникальных параметров устройства и времени создает "электронную печать".

### Как использовать

```typescript
import { createHmacSignature, verifyHmacSignature } from "@/shared/lib/crypto";
import { headers } from "next/headers";

export async function submitConsent(userId: string) {
  const reqHeaders = headers();
  const ip = reqHeaders.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = reqHeaders.get("user-agent") ?? "unknown";
  const nowStr = new Date().toISOString();
  
  // Создаем пейлоад
  const payload = JSON.stringify({ userId, ip, userAgent, type: "INTAKE_V1", date: nowStr });
  
  // Генерируем невидимую подпись (с помощью секретного ENCRYPTION_KEY)
  const signature = createHmacSignature(payload);
  
  // Сохраняем в таблицу ClientConsent (userId, ip, userAgent, agreedAt, signature)
}
```

Модель HMAC невозможно подделать, не зная секретный ключ, поэтому она служит сильным доказательством при разбирательствах.
