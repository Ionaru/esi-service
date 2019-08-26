/* tslint:disable:no-big-function */

import { AxiosResponse } from 'axios';
import * as httpStatus from 'http-status-codes';

import { CacheController, PublicESIService } from './';
import mockAxios from './__mocks__/axios';

describe('PublicESIService tests', () => {

    const url = 'https://esi.url/v0/universe/types/34';

    interface ITypeData {
        name: string;
    }

    const expectedResult: ITypeData = {
        name: 'Tritanium',
    };

    let warningSpy: jest.SpyInstance;

    beforeEach(() => {
        warningSpy = jest.spyOn(process, 'emitWarning');
    });

    afterEach(() => {
        warningSpy.mockReset();
        mockAxios.get.mockReset();
    });

    function axiosCreateMock() {
        return {
            get: mockAxios.get,
        };
    }

    function axiosGetMock(returnValue: AxiosResponse) {
        const validateStatusFunction = mockAxios.get.mock.calls[0][1].validateStatus;
        if (validateStatusFunction(returnValue.status)) {
            return returnValue;
        }

        // This would normally be an Axios error.
        throw new Error('HTTP Error');
    }

    test('new PublicESIService no parameters', async () => {

        mockAxios.create.mockImplementationOnce(axiosCreateMock);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {},
            status: httpStatus.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService();

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toEqual('Tritanium');
    });

    test('new PublicESIService default axios', async () => {

        mockAxios.create.mockImplementationOnce(axiosCreateMock);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                expires: Date.now() + 60000,
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));

        const cache = new CacheController();
        const esi = new PublicESIService({cacheController: cache});

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toEqual('Tritanium');
    });

    test('new PublicESIService default CacheController', async () => {

        new PublicESIService({axiosInstance: mockAxios as any});

        expect(warningSpy).toHaveBeenCalledWith('No CacheController instance given to PublicESIService, requests will not be cached!');
    });

    test('fetchESIData', async () => {

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {},
            status: httpStatus.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService({axiosInstance: mockAxios as any});

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toEqual('Tritanium');
    });

    test('fetchESIData expiry caching', async () => {

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                expires: Date.now() + 60000,
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));

        const cache = new CacheController();

        const esi = new PublicESIService({
            axiosInstance: mockAxios as any,
            cacheController: cache,
        });

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toEqual('Tritanium');

        // Result should have been cached.

        const result2 = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(result2).toBeTruthy();
        expect(result2!.name).toEqual('Tritanium');
    });

    test('fetchESIData etag caching', async () => {

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                etag: '12345',
                expires: Date.now() - 60000,
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));

        const cache = new CacheController();

        const esi = new PublicESIService({
            axiosInstance: mockAxios as any,
            cacheController: cache,
        });

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toEqual('Tritanium');

        // Result should have been cached.

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: '',
            headers: {
                etag: '12345',
                expires: Date.now() - 60000,
            },
            status: httpStatus.NOT_MODIFIED,
            statusText: 'NOT MODIFIED',
        }));

        const result2 = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(2);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result2).toBeTruthy();
        expect(result2!.name).toEqual('Tritanium');
    });

    test('fetchESIData error', async () => {

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: 'Something went wrong!',
            headers: {},
            status: httpStatus.INTERNAL_SERVER_ERROR,
            statusText: 'Internal Server Error',
        }));

        const esi = new PublicESIService({axiosInstance: mockAxios as any});

        await expect(esi.fetchESIData<ITypeData>(url)).rejects.toThrow('HTTP Error');
    });

    test('fetchESIData warning', async () => {

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'Oh no! A warning!',
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService({axiosInstance: mockAxios as any});

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toEqual('Tritanium');

        expect(warningSpy).toHaveBeenCalledWith(`HTTP request warning. ${url}: Oh no! A warning!`);
    });

    test('fetchESIData double warning same URL', async () => {

        const esi = new PublicESIService({axiosInstance: mockAxios as any, cacheController: new CacheController()});

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'You have been warned!',
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));
        await esi.fetchESIData<ITypeData>(url);

        expect(warningSpy).toHaveBeenCalledTimes(1);
        expect(warningSpy).toHaveBeenCalledWith(`HTTP request warning. ${url}: You have been warned!`);

        // Do second request to same url.
        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'You have been warned!',
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));
        await esi.fetchESIData<ITypeData>(url);

        // emitWarning should not have been called a second time.
        expect(warningSpy).toHaveBeenCalledTimes(1);
    });

    test('fetchESIData double warning different URL', async () => {

        const esi = new PublicESIService({axiosInstance: mockAxios as any, cacheController: new CacheController()});

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'The first warning!',
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));
        await esi.fetchESIData<ITypeData>(url);

        expect(warningSpy).toHaveBeenCalledTimes(1);
        expect(warningSpy).toHaveBeenCalledWith(`HTTP request warning. ${url}: The first warning!`);

        // Do second request to a different url.
        const url2 = 'https://esi.url/v0/universe/types/35';
        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url: url2},
            data: expectedResult,
            headers: {
                warning: 'The second warning!',
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));
        await esi.fetchESIData<ITypeData>(url2);

        // emitWarning should have been called a second time for the different url.
        expect(warningSpy).toHaveBeenCalledTimes(2);
        expect(warningSpy).toHaveBeenCalledWith(`HTTP request warning. ${url2}: The second warning!`);
    });

    test('fetchESIData custom onRouteWarning', async () => {

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'You have been warned again!',
            },
            status: httpStatus.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService({
            axiosInstance: mockAxios as any,
            onRouteWarning: (route, text) => {
                throw new Error(`Route warning: ${route}, ${text}`);
            },
        });

        await expect(esi.fetchESIData<ITypeData>(url)).rejects.toThrow(`Route warning: ${url}, You have been warned again!`);
    });

    test('validateStatus', async () => {

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {},
            status: httpStatus.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService({axiosInstance: mockAxios as any});
        await esi.fetchESIData<ITypeData>(url);

        const validateStatusFunction = mockAxios.get.mock.calls[0][1].validateStatus;

        [
            httpStatus.OK,
            httpStatus.NOT_MODIFIED,
        ].forEach((status) => {
            const valid = validateStatusFunction(status);
            expect(valid).toBe(true);
        });

        [
            httpStatus.NO_CONTENT,
            httpStatus.BAD_REQUEST,
            httpStatus.UNAUTHORIZED,
            httpStatus.FORBIDDEN,
            httpStatus.NOT_FOUND,
            httpStatus.INTERNAL_SERVER_ERROR,
            httpStatus.BAD_GATEWAY,
            httpStatus.SERVICE_UNAVAILABLE,
            httpStatus.GATEWAY_TIMEOUT,
        ].forEach((status) => {
            const valid = validateStatusFunction(status);
            expect(valid).toBe(false);
        });
    });
});
