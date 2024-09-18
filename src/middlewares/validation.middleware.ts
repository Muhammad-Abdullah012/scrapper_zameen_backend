import { plainToInstance } from 'class-transformer';
import { validateOrReject, ValidationError } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { AVAILABLE_CITIES } from '@/types';
import { getPropertyPurpose, getPropertyTypes } from '@/utils/helpers';
import { isInvalidNumber, isValidRange, PROPERTY_CATEGORY_MAP, returnBadRequestError } from '@/utils/validation.helpers';
import { PropertyPurposeType, PropertyType } from '@/models/models';
import {
  IvalidateAreaFilterQueryParams,
  IvalidatePropertyTypeFilterQueryParams,
  IvalidateIsPostedByAgencyFilterQueryParams,
  IvalidateSearchFiltersMiddlewareQueryParams,
} from '@/types/middleware.interfaces';
import { splitAndTrimString } from '@/utils';

/**
 * @name ValidationMiddleware
 * @description Allows use of decorator and non-decorator based validation
 * @param type dto
 * @param skipMissingProperties When skipping missing properties
 * @param whitelist Even if your object is an instance of a validation class it can contain additional properties that are not defined
 * @param forbidNonWhitelisted If you would rather to have an error thrown when any non-whitelisted properties are present
 */
export const ValidationMiddleware = (type: any, skipMissingProperties = false, whitelist = true, forbidNonWhitelisted = true) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dto = plainToInstance(type, req.body);
    return validateOrReject(dto, { skipMissingProperties, whitelist, forbidNonWhitelisted })
      .then(() => {
        req.body = dto;
        next();
      })
      .catch((errors: ValidationError[]) => {
        const message = errors.map((error: ValidationError) => Object.values(error.constraints)).join(', ');
        next(new HttpException(400, message));
      });
  };
};

// Middleware to validate req.params.city
export const validateCityParam = (req: Request, res: Response, next: NextFunction) => {
  const { city } = req.params;

  if (city == null || Object.values(AVAILABLE_CITIES).includes(city as AVAILABLE_CITIES)) {
    next();
  } else {
    return returnBadRequestError({
      res,
      message: `Invalid city parameter. It must be one of following: ${Object.values(AVAILABLE_CITIES).join(', ')}`,
    });
  }
};

export const validateSearchQueryParamMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { query } = req;
  query.location_ids = query.location_ids || '';
  const { location_ids } = query as { location_ids: string };

  if (splitAndTrimString(location_ids).some(isInvalidNumber)) {
    return returnBadRequestError({ res, message: 'Invalid location_ids search parameter. It must be a string of numbers separated by comma.' });
  }
  next();
};

export const validateSearchFiltersMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const { query } = req;
  const defaultQueryParams = {
    property_type: '',
    area_min: '0',
    area_max: '',
    price_min: '1',
    price_max: '',
    bedrooms: '',
    start_date: '',
    end_date: '',
  };
  Object.keys(defaultQueryParams).forEach(param => {
    if (query[param] == null) {
      query[param] = defaultQueryParams[param];
    }
  });

  query.bedrooms = query.bedrooms
    .toString()
    .toLowerCase()
    .replace(/all|studio/g, '');

  const { price_min, price_max, bedrooms, start_date, end_date } = query as unknown as IvalidateSearchFiltersMiddlewareQueryParams;

  switch (true) {
    case isInvalidNumber(price_min):
    case price_max && isInvalidNumber(price_max):
      return returnBadRequestError({ res, message: 'Invalid price parameters. Both price_min and price_max must be valid numbers.' });
    case bedrooms && splitAndTrimString(bedrooms).some(bedroom => isInvalidNumber(bedroom, 1)):
      return returnBadRequestError({ res, message: 'Invalid bedrooms parameter. It must be a valid number.' });
    case start_date && isNaN(Date.parse(start_date)):
      return returnBadRequestError({ res, message: 'Invalid start_date parameter. It must be a valid date in iso string format.' });
    case end_date && isNaN(Date.parse(end_date)):
      return returnBadRequestError({ res, message: 'Invalid end_date parameter. It must be a valid date in iso string format.' });
  }
  next();
};

export const validatePropertyId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.query as { id: string };
  if (isNaN(Number(id))) {
    return returnBadRequestError({ res, message: 'Invalid property id parameter. It must be a valid number.' });
  }
  next();
};

export const validatePurposeFilter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req;
    query.purpose = query.purpose || 'for_sale';
    const { purpose } = query as { purpose: PropertyPurposeType };
    const dbPurpose = await getPropertyPurpose();
    if (!dbPurpose.includes(purpose)) {
      return returnBadRequestError({ res, message: `Invalid purpose parameter. It must be one of following: ${dbPurpose.join(',')}.` });
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const validatePropertyTypeFilter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req;
    query.property_type = PROPERTY_CATEGORY_MAP[query.property_type as string] || query.property_type || '';
    const { property_type } = query as unknown as IvalidatePropertyTypeFilterQueryParams;
    if (property_type === ('' as PropertyType)) {
      return next();
    }
    const propertyTypePromise = getPropertyTypes();
    const propertyTypesArray = splitAndTrimString(property_type);
    const PROPERTY_TYPES = await propertyTypePromise;
    const invalidTypes = propertyTypesArray.filter(type => !PROPERTY_TYPES.includes(type as PropertyType));
    if (invalidTypes.length > 0)
      return returnBadRequestError({
        res,
        message: `Invalid property_type parameter. Following values are invalid: ${invalidTypes.join(
          ', ',
        )}. Valid values are: ${PROPERTY_TYPES.join(', ')}`,
      });
    next();
  } catch (err) {
    next(err);
  }
};

export const validateAreaFilter = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req;
    query.area_min = query.area_min || '0';
    query.area_max = query.area_max || '';
    const { area_min, area_max } = query as unknown as IvalidateAreaFilterQueryParams;
    if (isInvalidNumber(area_min) || (area_max && isInvalidNumber(area_max))) {
      return returnBadRequestError({ res, message: 'Invalid area parameters. Both area_min and area_max must be valid numbers (in square feet).' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const validateIsPostedByAgencyFilter = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req;
    const { is_posted_by_agency } = query as unknown as IvalidateIsPostedByAgencyFilterQueryParams;
    if (is_posted_by_agency && is_posted_by_agency !== 'false' && is_posted_by_agency !== 'true') {
      return returnBadRequestError({ res, message: 'Invalid is_posted_by_agency parameter. It must be either true or false.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const validateLimitFilter = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req;
    query.limit = query.limit || '1';
    const { limit } = query as { limit: string };
    if (isInvalidNumber(limit, 1)) {
      return returnBadRequestError({ res, message: 'Invalid limit parameter. It must be a valid number (minimum allowed value is 1).' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const validateYearCountFilter = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req;
    query.year_count = query.year_count || '1';
    const { year_count } = query as { year_count: string };
    if (isInvalidNumber(year_count, 1) || !isValidRange(year_count, 1, 5)) {
      return returnBadRequestError({ res, message: 'Invalid year_count parameter. It must be a valid number between 1 and 5.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};
