import crypto from 'crypto';

// The algorithm used for application-level encryption
const ALGORITHM = 'aes-256-gcm';

// Standard 32-byte key derived from env for AES-256
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY is not set in environment variables');
    }
    // Fallback for development if not set
    return crypto.createHash('sha256').update('development_fallback_secret_only').digest();
  }

  if (secret.length === 64) {
    return Buffer.from(secret, 'hex');
  }

  // Hash whatever string is provided to ensure it's exactly 32 bytes
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a string (e.g. JSON.stringify data) using AES-256-GCM.
 * The output format is: iv:encrypted_text:auth_tag
 */
export function encryptData(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 12 bytes is standard for GCM

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Return iv, cipher, and authTag concatenated
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  } catch (error) {
    console.error('Failed to encrypt data:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts a string that was encrypted by encryptData()
 */
export function decryptData(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, encryptedTextHex, authTagHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Creates an HMAC signature acting as an electronic seal.
 */
export function createHmacSignature(payload: string): string {
  const key = getEncryptionKey();
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Verifies if an HMAC signature is fully valid against the payload.
 */
export function verifyHmacSignature(payload: string, signature: string): boolean {
  const expectedSignature = createHmacSignature(payload);

  // Prevent timing attacks using crypto.timingSafeEqual
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);

    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
