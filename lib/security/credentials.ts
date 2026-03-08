import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("Missing CREDENTIAL_ENCRYPTION_KEY");
  }

  // Accept either base64(32 bytes) or plain text that we hash deterministically.
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 43) {
    const base64 = Buffer.from(raw, "base64");
    if (base64.length === 32) {
      return base64;
    }
  }

  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, authTagB64, dataB64] = payload.split(".");

  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Invalid encrypted credential payload");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
