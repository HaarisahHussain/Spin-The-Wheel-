import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export function createReceiptCodec(key) {
  const encryptionKey = Buffer.from(key, 'hex');
  if (encryptionKey.length !== 32)
    throw Error('RECEIPT_KEY must contain 64 hexadecimal characters.');
  function seal(value) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), bytes].map((b) => b.toString('base64')).join('.');
  }
  function open(value) {
    const [iv, tag, bytes] = value.split('.').map((s) => Buffer.from(s, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(bytes), decipher.final()]).toString());
  }
  return { seal, open };
}
