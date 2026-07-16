# Руководство по безопасности: Шифрование данных уровней БД и выдача цифровых подписей (HMAC)

Этот гайд описывает, как разработчики могут использовать встроенные в платформу утилиты криптографии для защиты пользовательских данных и генерации доказуемых отпечатков (сигнатур) на сервере без участия пользователя.
Файл утилит находится по пути: `src/lib/crypto.ts`.

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

HMAC нельзя подделать без секретного ключа, поэтому он надёжно фиксирует внутреннюю целостность записи. Однако HMAC
не является независимой внешней электронной подписью: проверить его может только сторона, владеющая ключом.

## 3. Проверяемый конверт согласия первичной анкеты

Для новых первичных анкет используется отдельный `CONSENT_HMAC_KEY`, а не ключ шифрования. Система сохраняет:

- канонический payload с пользователем, типом согласия, локалью, версией формы, временем, IP и User-Agent;
- SHA-256-хеш снимка вопросов и хеш ответов, без сохранения ответов в payload;
- идентификатор ключа `consent-hmac-v1` и HMAC-SHA-256;
- связь согласия с конкретной записью `IntakeResponse`.

При открытии подписи администратор может запустить проверку. Она заново вычисляет хеши формы и ответов, сравнивает
метаданные с payload и проверяет HMAC постоянным по времени сравнением. Результат `«Подпись действительна, данные не
изменены»` означает, что сохранённая запись совпадает с подписанным сервером конвертом.

Старые согласия без payload отображаются как непроверяемые — их история не переписывается. Для независимой проверки
третьей стороной понадобится отдельная асимметричная подпись и, при необходимости, доверенная метка времени.

В production добавьте отдельный ключ в секреты окружения:

```env
CONSENT_HMAC_KEY=<64-hex-characters>
```
