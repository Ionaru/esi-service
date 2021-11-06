import { existsSync, readFileSync, writeFileSync } from 'fs';

import { AxiosResponse } from 'axios';
import Debug, { Debugger } from 'debug';
import { StatusCodes } from 'http-status-codes';

export interface IResponseCache {
    [key: string]: ICacheObject | undefined;
}

export interface IDefaultExpireTimes {
    [key: string]: number | undefined;
}

export interface ICacheObject {
    data: any;
    etag?: string;
    expiry?: number;
    headers?: any;
}

export class CacheController {

    /**
     * The object where cached responses are saved, the response URL is used as the key.
     * Cached responses are accessible by querying responseCache[url].
     * @type {IResponseCache}
     */
    public readonly responseCache: IResponseCache = {};

    private readonly savePath?: string;
    private readonly defaultExpireTimes: IDefaultExpireTimes = {};
    private readonly debug: Debugger;

    /**
     * Creates a CacheController instance.
     * @param {string} savePath - Path where the cache will be saved when dumpCache() is called.
     * @param {IDefaultExpireTimes} defaultExpireTimes - An object holding an URL or domain as key and the default expire time as value.
     * @param {Debugger} debug - A Debugger instance to log debug output to.
     * The default expire time will only be used when there is no `expires` header present in the response.
     */
    public constructor(savePath?: string, defaultExpireTimes?: IDefaultExpireTimes, debug?: Debugger) {
        this.savePath = savePath;
        this.debug = (debug ? debug : Debug('esi-service')).extend('CacheController');

        if (this.savePath) {
            this.responseCache = this.readCache();
        }

        if (defaultExpireTimes) {
            this.defaultExpireTimes = defaultExpireTimes;
        }
    }

    /**
     * Checks if data from the cache is expired or not.
     * @param {ICacheObject} cache - The cached data to check.
     * @returns {boolean} - true if the cache is expired, otherwise false
     */
    public static isExpired = (cache?: ICacheObject): boolean => (cache && cache.expiry) ? cache.expiry < Date.now() : true;

    /**
     * Write the cache to a file.
     */
    public dumpCache(): void {
        if (this.savePath) {
            const cacheString = JSON.stringify(this.responseCache);
            writeFileSync(this.savePath, cacheString);
        }
    }

    /**
     * Read and import the cache from a file.
     * This function will not error and instead leave the cache empty if any problem was found during reading.
     * @returns {IResponseCache}
     */
    public readCache(): IResponseCache {
        if (this.savePath && existsSync(this.savePath)) {
            const cacheString = readFileSync(this.savePath).toString();
            let cacheJson;
            try {
                cacheJson = JSON.parse(cacheString);
            } catch (error: any) {
                process.emitWarning(error.message);
            }

            if (cacheJson) {
                this.debug(`${Object.keys(cacheJson).length} cached items loaded into memory`);
                return cacheJson;
            }
        }
        return {};
    }

    /**
     * Save an AxiosResponse to the cache.
     * The `ETag` and `expires` headers will be saved to check validity of the cache.
     * If the HTTP code is not OK or NOT_MODIFIED, the response will not be saved.
     * @param {AxiosResponse} response - the response to save.
     */
    public saveToCache(response: AxiosResponse): void {
        const url = response.config.url;

        if (!url) {
            throw new Error('Unable to save to cache, no URL given');
        }

        if (response.status === StatusCodes.OK) {

            this.responseCache[url] = {
                data: response.data,
                headers: response.headers,
            };

            this.setCacheExpiry(url, response);
            this.setCacheETag(url, response);

        // Since response is NOT MODIFIED, the response should already be in the cache, just update the expiry if needed.
        } else if (response.status === StatusCodes.NOT_MODIFIED) {
            this.setCacheExpiry(url, response);
        }
    }

    /**
     * Called from saveToCache, this function sets an expiry time if needed.
     * If an expiry time was not detected in a response but the cached response does have one, it will be deleted.
     * @param {string} url
     * @param {AxiosResponse} response
     */
    private setCacheExpiry(url: string, response: AxiosResponse): void {
        if (response.headers.expires) {

            if (!Number.isNaN(Number(response.headers.expires))) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.responseCache[url]!.expiry = Number(response.headers.expires);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.responseCache[url]!.expiry = new Date(response.headers.expires).getTime();
            }

        } else {

            // Use the default expiry time if it exists for the URL.
            const defaultExpireTime = Object.keys(this.defaultExpireTimes).find((key) => url.includes(key));
            if (defaultExpireTime) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const expires = Date.now() + this.defaultExpireTimes[defaultExpireTime]!;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.responseCache[url]!.expiry = expires;
                response.headers.expires = expires.toString();
            } else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                delete this.responseCache[url]!.expiry;
            }
        }
    }

    /**
     * Called from saveToCache, this function sets an ETag value if needed.
     * If an ETag was not detected in a response but the cached response does have one, it will be deleted.
     * @param {string} url
     * @param {AxiosResponse} response
     */
    private setCacheETag(url: string, response: AxiosResponse): void {
        if (response.headers.etag) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.responseCache[url]!.etag = response.headers.etag;
        } else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            delete this.responseCache[url]!.etag;
        }
    }
}
