import { plainToInstance } from 'class-transformer';
import { Request, Response, NextFunction } from 'express';
import { validateOrReject, ValidationError } from 'class-validator';

import { getPropertyPurpose, getPropertyTypes } from '@/utils/helpers';
import { HttpException } from '@exceptions/HttpException';
import {
  validateAreaFilter,
  validateCityParam,
  validateIsPostedByAgencyFilter,
  validatePropertyId,
  validatePropertyTypeFilter,
  validatePurposeFilter,
  validateSearchFiltersMiddleware,
  validateSearchQueryParamMiddleware,
  ValidationMiddleware,
} from '../middlewares/validation.middleware';

jest.mock('class-validator', () => ({
  validateOrReject: jest.fn(),
}));
jest.mock('@/utils/helpers', () => ({
  getPropertyTypes: jest.fn(),
  getPropertyPurpose: jest.fn(),
}));

describe('All ValidationMiddlewares', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} } as Request;
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;
    next = jest.fn();
  });

  const expectFunctionToBeCalledOnce = func => {
    expect(func).toHaveBeenCalledTimes(1);
  };

  const expectBadRequestError = () => {
    expectFunctionToBeCalledOnce(res.status);
    expect(res.status).toHaveBeenCalledWith(400);
  };

  describe('ValidationMiddleware', () => {
    it('should call next with no errors when the validation passes', async () => {
      const DTO = class {};
      const dto = plainToInstance(DTO, {});
      (validateOrReject as jest.Mock).mockResolvedValue(undefined);

      await ValidationMiddleware(DTO)(req, res, next);

      expectFunctionToBeCalledOnce(next);
      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual(dto);
    });

    it('should call next with an HttpException when the validation fails', async () => {
      const DTO = class {};
      const dto = plainToInstance(DTO, {});
      (validateOrReject as jest.Mock).mockRejectedValue([
        {
          property: 'property',
          value: 'value',
          constraints: {
            isNotEmpty: 'property should not be empty',
          },
        },
      ] as ValidationError[]);

      await ValidationMiddleware(DTO)(req, res, next);

      expectFunctionToBeCalledOnce(next);
      expect(next).toHaveBeenCalledWith(expect.any(HttpException));
      expect((next as jest.Mock).mock.calls[0][0]).toBeInstanceOf(HttpException);
      expect((next as jest.Mock).mock.calls[0][0].message).toEqual('property should not be empty');
      expect(req.body).toEqual(dto);
    });

    it('should call next with no errors when the validation passes and skipMissingProperties is true', async () => {
      const DTO = class {};
      const dto = plainToInstance(DTO, {});
      (validateOrReject as jest.Mock).mockResolvedValue(undefined);

      await ValidationMiddleware(DTO, true)(req, res, next);

      expectFunctionToBeCalledOnce(next);
      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual(dto);
    });

    it('should call next with no errors when the validation passes and whitelist is false', async () => {
      const DTO = class {};
      const dto = plainToInstance(DTO, {});
      (validateOrReject as jest.Mock).mockResolvedValue(undefined);

      await ValidationMiddleware(DTO, false, false)(req, res, next);

      expectFunctionToBeCalledOnce(next);
      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual(dto);
    });

    it('should call next with no errors when the validation passes and forbidNonWhitelisted is false', async () => {
      const DTO = class {};
      const dto = plainToInstance(DTO, {});
      (validateOrReject as jest.Mock).mockResolvedValue(undefined);

      await ValidationMiddleware(DTO, false, true, false)(req, res, next);

      expectFunctionToBeCalledOnce(next);
      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual(dto);
    });
  });

  describe('validateCityParam middleware', () => {
    it('should call next when city parameter is null', () => {
      req.params.city = null;
      validateCityParam(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('should call next when city parameter is valid', () => {
      req.params.city = 'islamabad';
      validateCityParam(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('should return error when city parameter is invalid', () => {
      req.params.city = 'Invalid City';
      validateCityParam(req, res, next);
      expectBadRequestError();
    });
  });

  describe('validateSearchQueryParamMiddleware', () => {
    it('should call next() when location_ids is valid', () => {
      req.query.location_ids = '1,2,3';
      validateSearchQueryParamMiddleware(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('should return bad request error when location_ids is invalid (non-numeric value)', () => {
      req.query.location_ids = '1,a,3';
      validateSearchQueryParamMiddleware(req, res, next);
      expectBadRequestError();
    });

    it('should return call next() when location_ids is empty string', () => {
      req.query.location_ids = '';
      validateSearchQueryParamMiddleware(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('should call next() when location_ids is missing', () => {
      delete req.query.location_ids;
      validateSearchQueryParamMiddleware(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('should call next() when multiple valid location_ids are provided', () => {
      req.query.location_ids = '1,2,3,4,5';
      validateSearchQueryParamMiddleware(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });
  });

  describe('validateSearchFiltersMiddleware', () => {
    it('sets default query parameters when not provided', async () => {
      await validateSearchFiltersMiddleware(req, res, next);
      expect(req.query).toEqual({
        property_type: '',
        area_min: '0',
        area_max: '',
        price_min: '1',
        price_max: '',
        bedrooms: '',
        start_date: '',
        end_date: '',
      });
    });

    it('sets bedrooms parameter to empty string when all or studio is provided', async () => {
      req.query.bedrooms = 'all';
      await validateSearchFiltersMiddleware(req, res, next);
      expect(req.query.bedrooms).toBe('');

      req.query.bedrooms = 'studio';
      await validateSearchFiltersMiddleware(req, res, next);
      expect(req.query.bedrooms).toBe('');
    });

    it('returns bad request error for invalid price parameters', async () => {
      req.query.price_min = 'abc';
      await validateSearchFiltersMiddleware(req, res, next);
      expectBadRequestError();

      req.query = { price_min: '1', price_max: 'abc' };
      await validateSearchFiltersMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns bad request error for invalid bedrooms parameter', async () => {
      req.query.bedrooms = 'abc';
      await validateSearchFiltersMiddleware(req, res, next);
      expectBadRequestError();
    });

    it('returns bad request error for invalid start date parameter', async () => {
      req.query.start_date = 'abc';
      await validateSearchFiltersMiddleware(req, res, next);
      expectBadRequestError();
    });

    it('returns bad request error for invalid end date parameter', async () => {
      req.query.end_date = 'abc';
      await validateSearchFiltersMiddleware(req, res, next);
      expectBadRequestError();
    });

    it('calls next function for valid query parameters', async () => {
      req.query = { price_min: '1', price_max: '10', bedrooms: '2', start_date: '2022-01-01', end_date: '2022-01-31' };

      await validateSearchFiltersMiddleware(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });
  });

  describe('validatePropertyId', () => {
    it('should call next() when property id is a valid number', () => {
      req.query.id = '123';
      validatePropertyId(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('should return bad request error when property id is a non-number string', () => {
      req.query.id = 'abc';
      validatePropertyId(req, res, next);
      expectBadRequestError();
    });

    it('should return bad request error when property id is missing', () => {
      delete req.query.id;
      validatePropertyId(req, res, next);
      expectBadRequestError();
    });
  });

  describe('validatePurposeFilter', () => {
    it('sets default purpose to "for_sale" when not provided', async () => {
      await validatePurposeFilter(req, res, next);
      expect(req.query.purpose).toBe('for_sale');
    });

    it('allows valid purpose to pass', async () => {
      req.query.purpose = 'rent';
      (getPropertyPurpose as jest.Mock).mockResolvedValue(['rent', 'for_sale']);
      await validatePurposeFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('returns bad request error for invalid purpose', async () => {
      req.query.purpose = 'invalid';
      (getPropertyPurpose as jest.Mock).mockResolvedValue(['rent', 'for_sale']);
      await validatePurposeFilter(req, res, next);
      expectBadRequestError();
    });

    it('throws error when database purpose retrieval fails', async () => {
      (getPropertyPurpose as jest.Mock).mockRejectedValue(new Error('Mock error'));
      await validatePurposeFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('validatePropertyTypeFilter', () => {
    it('calls next() when property_type is an empty string', async () => {
      req.query.property_type = '';
      await validatePropertyTypeFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('calls next() when property_type is a valid type', async () => {
      req.query.property_type = 'valid-type';
      (getPropertyTypes as jest.Mock).mockResolvedValue(['valid-type']);
      await validatePropertyTypeFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('calls returnBadRequestError() when property_type is an invalid type', async () => {
      req.query.property_type = 'invalid-type';
      (getPropertyTypes as jest.Mock).mockResolvedValue(['valid-type']);
      await validatePropertyTypeFilter(req, res, next);
      expectBadRequestError();
    });

    it('calls next() with an error when getPropertyTypes() rejects', async () => {
      req.query.property_type = 'valid-type';
      (getPropertyTypes as jest.Mock).mockRejectedValue(new Error('Mock error'));
      await validatePropertyTypeFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('validateAreaFilter', () => {
    it('should call next() when area filter parameters are valid', () => {
      req.query = { area_min: '100', area_max: '200' };

      validateAreaFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('should set default values for missing area filter parameters', () => {
      validateAreaFilter(req, res, next);
      expect(req.query.area_min).toBe('0');
      expect(req.query.area_max).toBe('');
    });

    it('should return bad request error when area_min is invalid', () => {
      req.query.area_min = 'abc';
      validateAreaFilter(req, res, next);

      expectBadRequestError();
    });

    it('should return bad request error when area_max is invalid', () => {
      req.query.area_max = 'def';
      validateAreaFilter(req, res, next);
      expectBadRequestError();
    });

    it('should return bad request error when area_min is negative', () => {
      req.query.area_min = '-100';
      validateAreaFilter(req, res, next);
      expectBadRequestError();
    });

    it('should call next() when area_min and area_max are equal', () => {
      req.query = { area_min: '100', area_max: '100' };

      validateAreaFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });
  });

  describe('validateIsPostedByAgencyFilter', () => {
    it('calls next() when is_posted_by_agency is not provided', () => {
      validateIsPostedByAgencyFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('calls next() when is_posted_by_agency is true', () => {
      req.query.is_posted_by_agency = 'true';
      validateIsPostedByAgencyFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('calls next() when is_posted_by_agency is false', () => {
      req.query.is_posted_by_agency = 'false';
      validateIsPostedByAgencyFilter(req, res, next);
      expectFunctionToBeCalledOnce(next);
    });

    it('calls returnBadRequestError() when is_posted_by_agency is an invalid value', () => {
      req.query.is_posted_by_agency = 'invalid';
      validateIsPostedByAgencyFilter(req, res, next);
      expectBadRequestError();
    });
  });
});
