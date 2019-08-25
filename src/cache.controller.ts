import { AxiosResponse } from 'axios';
import Debug from 'debug';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as httpStatus from 'http-status-codes';

interface IResponseCache {
    [index: string]: ICacheObject | undefined;
}

interface IDefaultExpireTimes {
    [index: string]: number | undefined;
}

interface ICacheObject {
    expiry?: number;
    etag?: string;
    data: any;
}

export class CacheController {

    /**
     * Checks if data from the cache is expired or not.
     * @param {ICacheObject} cache - The cached data to check.
     * @returns {boolean} - true if the cache is expired, otherwise false
     */
    public static isExpired = (cache?: ICacheObject) => (cache && cache.expiry) ? cache.expiry < Date.now() : true;

    private static readonly debug = Debug('esi-service:CacheController');

    public readonly responseCache: IResponseCache = {};

    private readonly savePath?: string;
    private readonly defaultExpireTimes: IDefaultExpireTimes = {};

    /**
     * Creates a CacheController instance.
     * @param {string} savePath - Path where the cache will be saved when dumpCache() is called.
     * @param {IDefaultExpireTimes} defaultExpireTimes - An object holding an URL or domain as key and the default expire time as value.
     * The default expire time will only be used when there is no `expires` header present in the response.
     */
    constructor(savePath?: string, defaultExpireTimes?: IDefaultExpireTimes) {
        this.savePath = savePath;

        if (this.savePath) {
            this.responseCache = this.readCache();
        }

        if (defaultExpireTimes) {
            this.defaultExpireTimes = defaultExpireTimes;
        }
    }

    /**
     * Write the cache to a file.
     */
    public dumpCache() {
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
            } catch (error) {
                process.emitWarning(error.message);
            }

            if (cacheJson) {
                CacheController.debug(`${Object.keys(cacheJson).length} cached items loaded into memory`);
                return cacheJson;
            }
        }
        return {};
    }

    /**
     * Save an AxiosResponse to the cache.
     * @param {AxiosResponse} response - the response to save.
     */
    public saveToCache(response: AxiosResponse) {
        const url = response.config.url;

        if (!url) {
            throw new Error('Unable to save to cache, no URL given');
        }

        if (response.status === httpStatus.OK) {

            this.responseCache[url] = {
                data: response.data,
            };

            if (response.headers.expires) {
                this.responseCache[url]!.expiry = new Date(response.headers.expires).getTime();
            } else {

                // Use the default expiry time if it exists for the URL.
                const defaultExpireTime = Object.keys(this.defaultExpireTimes).find((key) => url.includes(key));
                if (defaultExpireTime) {
                    const expires = Date.now() + this.defaultExpireTimes[defaultExpireTime]!;
                    this.responseCache[url]!.expiry = response.headers.expires = expires;
                }
            }

            if (response.headers.etag) {
                this.responseCache[url]!.etag = response.headers.etag;
            }

            // Save response to cache but set to immediately expire.
            if (!response.headers.expires && !response.headers.etag) {
                this.responseCache[url]!.expiry = Date.now();
            }

        // Since response is NOT MODIFIED, the response should already be in the cache, just update the expiry if needed.
        } else if (response.status === httpStatus.NOT_MODIFIED && response.headers.expires) {
            this.responseCache[url]!.expiry = new Date(response.headers.expires).getTime();
        }
    }
}
