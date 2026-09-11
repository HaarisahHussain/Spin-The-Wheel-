import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
export function createMail({
  key,
  origin,
  preview = false,
  host,
  port = 587,
  user,
  password,
  from,
}) {
  const encryptionKey = Buffer.from(key, 'hex');
  if (encryptionKey.length !== 32) throw Error('MAIL_KEY must contain 64 hexadecimal characters.');
  const transport = host
    ? nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: user ? { user, pass: password } : undefined,
      })
    : null;
  const previewMessages = new Map();
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
  return {
    available: !!transport || preview,
    seal,
    open,
    previewMessages,
    async send(job) {
      const payload = open(job.payload);
      const link = `${origin}/verify?token=${encodeURIComponent(payload.token)}`;
      if (payload.subject) {
        if (preview) {
          previewMessages.set(job.id, payload);
          return;
        }
        if (!transport) throw Error('SMTP is not configured.');
        await transport.sendMail({
          from,
          to: payload.email,
          subject: payload.subject,
          text: payload.text + '\n\n' + origin,
        });
        return;
      }
      if (preview) {
        previewMessages.set(job.challengeId, { ...payload, link });
        return;
      }
      if (!transport) throw Error('SMTP is not configured.');
      await transport.sendMail({
        from,
        to: payload.email,
        subject: 'Your BCUSCA Arcade verification code',
        text: `Your code is ${payload.code}. It expires in 15 minutes.\n\nEnter it on the device where you requested it, or open this link in the same browser:\n${link}\n\nThis authorises that device to use your Arcade account. Never share this code. If you did not request it, ignore this email.`,
      });
    },
  };
}
