import * as index from './index';

describe('export tests', () => {

    it('must export everything', () => {
        expect.assertions(3);

        expect(Object.entries(index)).toHaveLength(2);
        expect(typeof index.CacheController).toBe('function');
        expect(typeof index.PublicESIService).toBe('function');
    });
});
