import {
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  rmdirSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
export function acquireInstance(filename) {
  const path = filename + '.instance',
    value = JSON.stringify({ pid: process.pid, token: randomUUID() });
  function create() {
    const fd = openSync(path, 'wx', 0o600);
    try {
      writeFileSync(fd, value);
    } finally {
      closeSync(fd);
    }
  }
  try {
    create();
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const guard = path + '.reclaim';
    try {
      mkdirSync(guard);
    } catch {
      throw Error(`Instance recovery already in progress at ${guard}.`);
    }
    try {
      const previous = readFileSync(path, 'utf8');
      let owner;
      try {
        owner = JSON.parse(previous);
      } catch {
        throw Error(`Unrecognised instance lock at ${path}. Confirm ownership before removing it.`);
      }
      const pid = typeof owner === 'number' ? owner : owner?.pid;
      if (!Number.isSafeInteger(pid) || pid <= 0)
        throw Error(`Cannot confirm ownership of ${path}.`);
      let stale = false;
      try {
        process.kill(pid, 0);
      } catch (e) {
        if (e.code === 'ESRCH') stale = true;
      }
      if (!stale)
        throw Error(
          `Another Arcade process owns ${filename}. Stop it before restarting or resetting.`,
        );
      if (readFileSync(path, 'utf8') !== previous)
        throw Error('Instance ownership changed. Try again.');
      unlinkSync(path);
      create();
    } finally {
      rmdirSync(guard);
    }
  }
  return () => {
    try {
      if (readFileSync(path, 'utf8') === value) unlinkSync(path);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  };
}
