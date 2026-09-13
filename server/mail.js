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
      const link = `${origin}/${payload.kind === 'reset' ? 'reset-password' : 'verify'}#token=${encodeURIComponent(payload.token)}`;
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
        subject: payload.kind === 'reset' ? 'Reset your Arcade password' : 'Verify your BCU email',
        text:
          payload.kind === 'reset'
            ? `Set a new Arcade password: ${link}\nThis link expires in 15 minutes. Ignore this message if you did not request it.`
            : `Your verification code is ${payload.code}. Enter it on the device where you registered, or confirm here: ${link}\nExpires in 15 minutes. Never share this code. Ignore this message if you did not register.`,
      });
    },
  };
}
