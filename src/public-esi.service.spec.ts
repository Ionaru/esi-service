/* eslint-disable jest/no-mocks-import,jest/no-hooks,sonarjs/no-identical-functions,@typescript-eslint/no-non-null-assertion */
import { AxiosResponse } from 'axios';
import { StatusCodes } from 'http-status-codes';

import mockAxios from './__mocks__/axios';

import { CacheController, PublicESIService } from './';

describe('publicESIService tests', () => {

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

    const axiosCreateMock = () => ({
        get: mockAxios.get,
    });

    const axiosGetMock = (returnValue: AxiosResponse) => {
        const validateStatusFunction = mockAxios.get.mock.calls[0][1].validateStatus;
        if (validateStatusFunction(returnValue.status)) {
            return returnValue;
        }

        // This would normally be an Axios error.
        throw new Error('HTTP Error');
    };

    it('new PublicESIService no parameters', async () => {
        expect.assertions(4);

        mockAxios.create.mockImplementationOnce(axiosCreateMock);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {},
            status: StatusCodes.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService();

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toStrictEqual('Tritanium');
    });

    it('new PublicESIService default axios', async () => {
        expect.assertions(4);

        mockAxios.create.mockImplementationOnce(axiosCreateMock);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                expires: Date.now() + 60000,
            },
            status: StatusCodes.OK,
            statusText: 'OK',
        }));

        const cache = new CacheController();
        const esi = new PublicESIService({cacheController: cache});

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toStrictEqual('Tritanium');
    });

    it('new PublicESIService default CacheController', async () => {
        expect.assertions(1);

        new PublicESIService({axiosInstance: mockAxios as any});

        expect(warningSpy).toHaveBeenCalledWith('No CacheController instance given to PublicESIService, requests will not be cached!');
    });

    it('fetchESIData', async () => {
        expect.assertions(4);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {},
            status: StatusCodes.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService({axiosInstance: mockAxios as any});

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toStrictEqual('Tritanium');
    });

    it('fetchESIData expiry caching', async () => {
        expect.assertions(7);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                expires: Date.now() + 60000,
            },
            status: StatusCodes.OK,
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
        expect(result!.name).toStrictEqual('Tritanium');

        // Result should have been cached.

        const result2 = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(result2).toBeTruthy();
        expect(result2!.name).toStrictEqual('Tritanium');
    });

    it('fetchESIData etag caching', async () => {
        expect.assertions(8);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                etag: '12345',
                expires: Date.now() - 60000,
            },
            status: StatusCodes.OK,
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
        expect(result!.name).toStrictEqual('Tritanium');

        // Result should have been cached.

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: '',
            headers: {
                etag: '12345',
                expires: Date.now() - 60000,
            },
            status: StatusCodes.NOT_MODIFIED,
            statusText: 'NOT MODIFIED',
        }));

        const result2 = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(2);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result2).toBeTruthy();
        expect(result2!.name).toStrictEqual('Tritanium');
    });

    it('fetchESIData error', async () => {
        expect.assertions(1);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: 'Something went wrong!',
            headers: {},
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            statusText: 'Internal Server Error',
        }));

        const esi = new PublicESIService({axiosInstance: mockAxios as any});

        await expect(esi.fetchESIData<ITypeData>(url)).rejects.toThrow('HTTP Error');
    });

    it('fetchESIData warning', async () => {
        expect.assertions(5);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'Oh no! A warning!',
            },
            status: StatusCodes.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService({axiosInstance: mockAxios as any});

        const result = await esi.fetchESIData<ITypeData>(url);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);
        expect(mockAxios.get).toHaveBeenCalledWith(url, expect.anything());
        expect(result).toBeTruthy();
        expect(result!.name).toStrictEqual('Tritanium');

        expect(warningSpy).toHaveBeenCalledWith(`HTTP request warning. ${url}: Oh no! A warning!`);
    });

    it('fetchESIData double warning same URL', async () => {
        expect.assertions(3);

        const esi = new PublicESIService({axiosInstance: mockAxios as any, cacheController: new CacheController()});

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'You have been warned!',
            },
            status: StatusCodes.OK,
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
            status: StatusCodes.OK,
            statusText: 'OK',
        }));
        await esi.fetchESIData<ITypeData>(url);

        // emitWarning should not have been called a second time.
        expect(warningSpy).toHaveBeenCalledTimes(1);
    });

    it('fetchESIData double warning different URL', async () => {
        expect.assertions(4);

        const esi = new PublicESIService({axiosInstance: mockAxios as any, cacheController: new CacheController()});

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'The first warning!',
            },
            status: StatusCodes.OK,
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
            status: StatusCodes.OK,
            statusText: 'OK',
        }));
        await esi.fetchESIData<ITypeData>(url2);

        // emitWarning should have been called a second time for the different url.
        expect(warningSpy).toHaveBeenCalledTimes(2);
        expect(warningSpy).toHaveBeenCalledWith(`HTTP request warning. ${url2}: The second warning!`);
    });

    it('fetchESIData custom onRouteWarning', async () => {
        expect.assertions(1);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {
                warning: 'You have been warned again!',
            },
            status: StatusCodes.OK,
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

    it('validateStatus', async () => {
        expect.assertions(11);

        mockAxios.get.mockImplementationOnce(async () => axiosGetMock({
            config: {url},
            data: expectedResult,
            headers: {},
            status: StatusCodes.OK,
            statusText: 'OK',
        }));

        const esi = new PublicESIService({axiosInstance: mockAxios as any});
        await esi.fetchESIData<ITypeData>(url);

        const validateStatusFunction = mockAxios.get.mock.calls[0][1].validateStatus;

        [
            StatusCodes.OK,
            StatusCodes.NOT_MODIFIED,
        ].forEach((status) => {
            const valid = validateStatusFunction(status);
            expect(valid).toBe(true);
        });

        [
            StatusCodes.NO_CONTENT,
            StatusCodes.BAD_REQUEST,
            StatusCodes.UNAUTHORIZED,
            StatusCodes.FORBIDDEN,
            StatusCodes.NOT_FOUND,
            StatusCodes.INTERNAL_SERVER_ERROR,
            StatusCodes.BAD_GATEWAY,
            StatusCodes.SERVICE_UNAVAILABLE,
            StatusCodes.GATEWAY_TIMEOUT,
        ].forEach((status) => {
            const valid = validateStatusFunction(status);
            expect(valid).toBe(false);
        });
    });
});
