/* eslint-disable jest/no-hooks,sonarjs/no-duplicate-string,@typescript-eslint/no-non-null-assertion */
import * as fs from 'node:fs';

import { InternalAxiosRequestConfig } from 'axios';
import { StatusCodes } from 'http-status-codes';
import * as timekeeper from 'timekeeper';

import { CacheController } from './';

jest.mock('fs');
// eslint-disable-next-line jest/require-hook
timekeeper.freeze(new Date());

const setReadFileSyncOutput = (output: string) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('node:fs').readFileSync = () => output;
};

const setWriteFileSyncOutput = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('node:fs').writeFileSync = () => { /* Nothing to do */ };
};

const throwReadFileSyncOutput = (throwable: any) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('node:fs').readFileSync = () => {
        throw throwable;
    };
};

const throwWriteFileSyncOutput = (throwable: any) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('node:fs').writeFileSync = () => {
        throw throwable;
    };
};

const setCacheFileExists = (exists: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('node:fs').existsSync = () => exists;
};

describe('cacheController tests', () => {

    let warningSpy: jest.SpyInstance;

    beforeEach(() => {
        warningSpy = jest.spyOn(process, 'emitWarning');
    });

    afterEach(() => {
        warningSpy.mockClear();
    });

    const simpleCacheFileContent = {
        'https://some.url/': {
            data: 1,
        },
    };

    it('new CacheController no parameters', () => {
        expect.assertions(1);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();
    });

    it('new CacheController with path, no file', () => {
        expect.assertions(1);

        setCacheFileExists(false);

        const cache = new CacheController('data/cache.json');
        expect(cache.responseCache).toBeTruthy();
    });

    it('new CacheController with path, unreadable file', () => {
        expect.assertions(1);

        setCacheFileExists(true);
        throwReadFileSyncOutput(new Error('Unreadable'));

        expect(() => new CacheController('data/cache.json')).toThrow('Unreadable');
    });

    it('new CacheController with path, malformed JSON', () => {
        expect.assertions(2);

        setCacheFileExists(true);
        setReadFileSyncOutput('This is in no way valid JSON!!');

        const cache = new CacheController('data/cache.json');
        expect(cache.responseCache).toBeTruthy();
        expect(warningSpy).toHaveBeenCalledWith('Unexpected token T in JSON at position 0');
    });

    it('new CacheController with path, file exists', () => {
        expect.assertions(4);

        setCacheFileExists(true);
        setReadFileSyncOutput(JSON.stringify(simpleCacheFileContent));

        const cache = new CacheController('data/cache.json');
        expect(cache.responseCache).toBeTruthy();
        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual(simpleCacheFileContent['https://some.url/']);
    });

    it('new CacheController with path no extension', () => {
        expect.assertions(4);

        setCacheFileExists(true);
        setReadFileSyncOutput(JSON.stringify(simpleCacheFileContent));

        const cache = new CacheController('data/cache');
        expect(cache.responseCache).toBeTruthy();
        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual(simpleCacheFileContent['https://some.url/']);
    });

    it('dumpCache no savePath', () => {
        expect.assertions(5);

        setCacheFileExists(true);
        setReadFileSyncOutput(JSON.stringify(simpleCacheFileContent));

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        cache.responseCache['https://some.url/'] = {
            data: 1,
        };
        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual(simpleCacheFileContent['https://some.url/']);

        setWriteFileSyncOutput();

        const writeSpy = jest.spyOn(fs, 'writeFileSync');

        cache.dumpCache();
        expect(writeSpy).toHaveBeenCalledTimes(0);
    });

    it('dumpCache', () => {
        expect.assertions(5);

        setCacheFileExists(true);
        setReadFileSyncOutput(JSON.stringify(simpleCacheFileContent));

        const cache = new CacheController('data/cache.json');
        expect(cache.responseCache).toBeTruthy();
        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual(simpleCacheFileContent['https://some.url/']);

        setWriteFileSyncOutput();

        const writeSpy = jest.spyOn(fs, 'writeFileSync');

        cache.dumpCache();
        expect(writeSpy).toHaveBeenCalledWith('data/cache.json', JSON.stringify(simpleCacheFileContent));
    });

    it('dumpCache 2', () => {
        expect.assertions(5);

        setCacheFileExists(true);
        setReadFileSyncOutput(JSON.stringify(simpleCacheFileContent));

        const cache = new CacheController('data/cache.json');
        expect(cache.responseCache).toBeTruthy();
        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual(simpleCacheFileContent['https://some.url/']);

        throwWriteFileSyncOutput(new Error('Unwritable!'));
        expect(() => cache.dumpCache()).toThrow('Unwritable!');
    });

    it('saveToCache with expiry', () => {
        expect.assertions(4);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        const expires = Date.now() + 60_000;

        cache.saveToCache({
            config: {url: 'https://some.url/'} as InternalAxiosRequestConfig,
            data: 'some data',
            headers: {expires: expires.toString()},
            status: StatusCodes.OK,
            statusText: 'OK',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual({
            data: 'some data', expiry: expires, headers: {expires: expires.toString()},
        });
    });

    it('saveToCache with etag', () => {
        expect.assertions(7);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        cache.saveToCache({
            config: {url: 'https://some.url/'} as InternalAxiosRequestConfig,
            data: 'some data',
            headers: {etag: '12645'},
            status: StatusCodes.OK,
            statusText: 'OK',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(cache.responseCache['https://some.url/']).toBeTruthy();
        expect(cache.responseCache['https://some.url/']!.data).toBe('some data');
        expect(cache.responseCache['https://some.url/']!.etag).toBe('12645');
        expect(cache.responseCache['https://some.url/']!.expiry).toBeUndefined();
    });

    it('saveToCache error response', () => {
        expect.assertions(3);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        cache.saveToCache({
            config: {url: 'https://some.url/'} as InternalAxiosRequestConfig,
            data: 'some data',
            headers: {etag: '12645'},
            status: StatusCodes.BAD_GATEWAY,
            statusText: 'BAD_GATEWAY',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(0);
        expect(cache.responseCache['https://some.url/']).toBeUndefined();
    });

    it('saveToCache with etag and expiry', () => {
        expect.assertions(4);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        const expires = Date.now() + 60_000;

        cache.saveToCache({
            config: {url: 'https://some.url/'} as InternalAxiosRequestConfig,
            data: 'some data',
            headers: {etag: '12645', expires: expires.toString()},
            status: StatusCodes.OK,
            statusText: 'OK',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual({
            data: 'some data', etag: '12645', expiry: expires, headers: {etag: '12645', expires: expires.toString()},
        });
    });

    it('saveToCache no url', () => {
        expect.assertions(3);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        const expires = Date.now() + 60_000;

        expect(() => {
            cache.saveToCache({
                config: {} as InternalAxiosRequestConfig,
                data: 'some data',
                headers: {expires: expires.toString()},
                status: StatusCodes.OK,
                statusText: 'OK',
            });
        }).toThrow('Unable to save to cache, no URL given');

        expect(Object.keys(cache.responseCache)).toHaveLength(0);
    });

    it('saveToCache not modified', () => {
        expect.assertions(7);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        const expires = Date.now() + 60_000;

        cache.saveToCache({
            config: {url: 'https://some.url/'} as InternalAxiosRequestConfig,
            data: 'some data',
            headers: {expires: expires.toString()},
            status: StatusCodes.OK,
            statusText: 'OK',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual({
            data: 'some data', expiry: expires, headers: {expires: expires.toString()},
        });

        const updatedExpiry = Date.now() + 120_000;

        cache.saveToCache({
            config: {url: 'https://some.url/'} as InternalAxiosRequestConfig,
            data: '',
            headers: {expires: updatedExpiry.toString()},
            status: StatusCodes.NOT_MODIFIED,
            statusText: 'Not Modified',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual({
            data: 'some data', expiry: updatedExpiry, headers: {expires: expires.toString()},
        });
    });

    it('saveToCache not modified without expiry', () => {
        expect.assertions(9);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        const expires = Date.now() + 60_000;

        cache.saveToCache({
            config: {url: 'https://some.url/'} as InternalAxiosRequestConfig,
            data: 'some data',
            headers: {expires: expires.toString()},
            status: StatusCodes.OK,
            statusText: 'OK',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(Object.values(cache.responseCache)).toContainEqual({
            data: 'some data', expiry: expires, headers: {expires: expires.toString()},
        });

        cache.saveToCache({
            config: {url: 'https://some.url/'} as InternalAxiosRequestConfig,
            data: '',
            headers: {},
            status: StatusCodes.NOT_MODIFIED,
            statusText: 'Not Modified',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/');
        expect(cache.responseCache['https://some.url/']).toBeTruthy();
        expect(cache.responseCache['https://some.url/']!.data).toBe('some data');
        expect(cache.responseCache['https://some.url/']!.expiry).toBeUndefined();
    });

    it('read non-existing cache', () => {
        expect.assertions(3);

        const cache = new CacheController();
        expect(cache.responseCache).toBeTruthy();

        expect(Object.keys(cache.responseCache)).toHaveLength(0);
        expect(cache.responseCache['https://some.url/']).toBeUndefined();
    });

    it('default expiry', () => {
        expect.assertions(4);

        const cache = new CacheController(undefined, {
            'https://some.url/': 5000,
        });
        expect(cache.responseCache).toBeTruthy();

        const expires = Date.now() + 5000;

        cache.saveToCache({
            config: {url: 'https://some.url/my-data'} as InternalAxiosRequestConfig,
            data: 'some data',
            headers: {},
            status: StatusCodes.OK,
            statusText: 'OK',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/my-data');
        expect(Object.values(cache.responseCache)).toContainEqual({
            data: 'some data', expiry: expires, headers: {expires: expires.toString()},
        });
    });

    it('handles a string expiry', () => {
        expect.assertions(4);

        const cache = new CacheController(undefined, {
            'https://some.url/': 5000,
        });
        expect(cache.responseCache).toBeTruthy();

        const expires = 'Sat, 06 Nov 2021 11:05:00 GMT';

        cache.saveToCache({
            config: {url: 'https://some.url/my-data'} as InternalAxiosRequestConfig,
            data: 'some data',
            headers: {expires},
            status: StatusCodes.OK,
            statusText: 'OK',
        });

        expect(Object.keys(cache.responseCache)).toHaveLength(1);
        expect(Object.keys(cache.responseCache)).toContain('https://some.url/my-data');
        expect(Object.values(cache.responseCache)).toContainEqual({
            data: 'some data', expiry: 1_636_196_700_000, headers: {expires},
        });
    });
});
