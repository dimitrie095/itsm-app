import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";

function getKey() {
  const raw = process.env.INTEGRATION_SECRET_KEY || process.env.NEXTAUTH_SECRET || "";
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plainText: string) {
  if (!plainText) return "";
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return "";
  if (!value.startsWith(ENCRYPTION_PREFIX)) return value;
  const payload = value.slice(ENCRYPTION_PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

export function isEncryptedSecret(value: string | null | undefined) {
  return Boolean(value && value.startsWith(ENCRYPTION_PREFIX));
}
