import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { downloadFile } from '../scripts/postinstall.js';

function mockGet(statusCode, body = '', headers = {}) {
  return (_url, callback) => {
    const request = new EventEmitter();
    const response = Readable.from(body ? [Buffer.from(body)] : []);
    response.statusCode = statusCode;
    response.headers = headers;
    process.nextTick(() => callback(response));
    return request;
  };
}

test('downloadFile does not leave a destination for an unsuccessful response', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'agent-browser-download-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, 'agent-browser');

  await assert.rejects(downloadFile('https://example.test/binary', destination, mockGet(404)), /HTTP 404/);

  assert.deepEqual(await readdir(directory), []);
});

test('downloadFile atomically installs a successful response', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'agent-browser-download-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, 'agent-browser');

  await downloadFile('https://example.test/binary', destination, mockGet(200, 'native-binary'));

  assert.equal(await readFile(destination, 'utf8'), 'native-binary');
  assert.deepEqual(await readdir(directory), ['agent-browser']);
});

test('downloadFile rejects an empty successful response', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'agent-browser-download-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, 'agent-browser');

  await assert.rejects(downloadFile('https://example.test/binary', destination, mockGet(200)), /empty response body/);

  assert.deepEqual(await readdir(directory), []);
});

