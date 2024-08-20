import { SORT_COLUMNS, SORT_ORDER } from '../types';
import { parseSortParams } from '../utils/pagination.helpers';
import { HttpException } from '../exceptions/HttpException';

describe('utils tests', () => {
  describe('parseSortParams', () => {
    it('should throw an error if sort_by and sort_order have different lengths', () => {
      expect(() => parseSortParams(`${SORT_COLUMNS.ID},${SORT_COLUMNS.PRICE}`, `${SORT_ORDER.ASC}`)).toThrow(HttpException);
      expect(() => parseSortParams(`${SORT_COLUMNS.ID}`, `${SORT_ORDER.ASC},${SORT_ORDER.DESC}`)).toThrow(HttpException);
    });

    it('should return default sorting order if sort_by and sort_order are empty', () => {
      expect(parseSortParams('', '')).toEqual([[SORT_COLUMNS.ID, SORT_ORDER.ASC]]);
    });

    it('should throw an error if sort_by value is invalid', () => {
      expect(() => parseSortParams('invalid', `${SORT_ORDER.ASC}`)).toThrow(HttpException);
    });

    it('should throw an error if sort_order value is invalid', () => {
      expect(() => parseSortParams(`${SORT_COLUMNS.ID}`, 'invalid')).toThrow(HttpException);
    });

    it('should return correct sorting order if sort_by and sort_order are valid', () => {
      expect(parseSortParams(`${SORT_COLUMNS.ID},${SORT_COLUMNS.PRICE}`, `${SORT_ORDER.ASC},${SORT_ORDER.DESC}`)).toEqual([
        [SORT_COLUMNS.ID, SORT_ORDER.ASC],
        [SORT_COLUMNS.PRICE, SORT_ORDER.DESC],
      ]);
    });
  });
});
