import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Debug, { Debugger } from 'debug';
import { StatusCodes } from 'http-status-codes';

import { CacheController } from './';

export interface IConstructorParameters {
    axiosInstance?: AxiosInstance;
    cacheController?: CacheController;
    onRouteWarning?: (route: string, text?: string) => void;
    debug?: Debugger;
}

export class PublicESIService {

    private static readonly acceptedStatusCodes = [
        StatusCodes.OK,
        StatusCodes.NOT_MODIFIED,
    ];

    private readonly axiosInstance: AxiosInstance;
    private readonly cacheController?: CacheController;
    private readonly onRouteWarning?: (route: string, text: string) => void;

    private readonly deprecationsLogged: string[] = [];

    private readonly debug: Debugger;

    /**
     * Create a new PublicESIService instance.
     * Parameters must be given in an object.
     * @param {AxiosInstance | undefined} axiosInstance - A optional custom AxiosInstance for the service to use. If not given the service
     * will create its own instance with default settings.
     * @param {CacheController | undefined} cacheController - A CacheController for caching requests, if missing there will be a warning
     * and requests will not be cached.
     * @param {((route: string, text?: string) => void) | undefined} onRouteWarning - A function to call when a route returns a `warning`
     * header, useful for custom logging.
     * @param {Debugger} debug - A Debugger instance to log debug output to.
     */
    public constructor({axiosInstance, cacheController, onRouteWarning, debug = Debug('esi-service')}: IConstructorParameters = {}) {

        this.onRouteWarning = onRouteWarning;

        this.axiosInstance = axiosInstance ? axiosInstance : axios.create();

        this.cacheController = cacheController;
        if (!this.cacheController) {
            process.emitWarning(`No CacheController instance given to ${this.constructor.name}, requests will not be cached!`);
        }

        this.debug = debug.extend('PublicESIService');
    }

    private static validateStatus = (status: number) => PublicESIService.acceptedStatusCodes.includes(status);

    /**
     * Fetch data from the ESI or any service like it (OpenAPI).
     * @param {string} url - The URL to fetch data from.
     * @returns {Promise<T>} - The optionally typed response data.
     */
    public async fetchESIData<T>(url: string): Promise<T> {

        // Return cached data if it exists and is still valid.
        if (this.cacheController && !CacheController.isExpired(this.cacheController.responseCache[url])) {
            this.debug(`${url} => (From cache)`);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this.cacheController.responseCache[url]!.data as T;
        }

        const requestConfig: AxiosRequestConfig = {
            // Make sure 304 responses are not treated as errors.
            validateStatus: PublicESIService.validateStatus,
        };

        // Set the etag header if a cached response exists.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (this.cacheController && this.cacheController.responseCache[url] && this.cacheController.responseCache[url]!.etag) {
            requestConfig.headers = {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                'If-None-Match': this.cacheController.responseCache[url]!.etag!,
            };
        }

        const response = await this.fetchESIDataRaw<T>(url, requestConfig);

        if (this.cacheController) {
            this.cacheController.saveToCache(response);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this.cacheController.responseCache[url]!.data as T;
        }

        return response.data;
    }

    /**
     * Fetch data from the ESI or any service like it (OpenAPI).
     * NO CACHING
     * @param {string} url - The URL to fetch data from.
     * @param {AxiosRequestConfig | undefined} config - Optional custom request config.
     * @returns {Promise<AxiosResponse<T>>} - The optionally typed response.
     */
    public async fetchESIDataRaw<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {

        const response = await this.axiosInstance.get<T>(url, config);

        this.debug(`${url} => ${response.status} ${response.statusText}`);

        if (response.headers.warning) {
            this.logWarning(url, response.headers.warning);
        }

        return response;
    }

    /**
     * Log a warning an ESI route might have given.
     * Warning will only be logged once for any route, multiple calls with the same route have no effect.
     * This function will also call the onRouteWarning constructor parameter if it was given.
     * @param {string} route - The route to log the warning for.
     * @param {string} text - The warning to log.
     */
    public logWarning(route: string, text: string): void {
        if (!this.deprecationsLogged.includes(route)) {

            if (this.onRouteWarning) {
                this.onRouteWarning(route, text);
            }

            process.emitWarning(`HTTP request warning. ${route}: ${text}`);
            this.deprecationsLogged.push(route);
        }
    }
}
