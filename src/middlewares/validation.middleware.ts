import { plainToInstance } from 'class-transformer';
import { validateOrReject, ValidationError } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { AVAILABLE_CITIES } from '@/types';
import { getPropertyPurpose, getPropertyTypes } from '@/utils/helpers';

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
    validateOrReject(dto, { skipMissingProperties, whitelist, forbidNonWhitelisted })
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
    res.status(400).json({ message: `Invalid city parameter. It must be one of following: ${Object.values(AVAILABLE_CITIES).join(', ')}` });
  }
};

export const validateSearchQueryParamMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.query == null) {
    req.query.query = '';
  }
  const { query } = req.query;
  if (typeof query !== 'string') {
    res.status(400).json({ message: 'Invalid query search parameter. It must be a string.' });
  } else {
    next();
  }
};

// add filters to search endpoints => property_type, area_min, area_max, price_min, price_max, bedrooms

export const validateSearchFiltersMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.query.property_type == null) {
    req.query.property_type = '';
  }
  if (req.query.area_min == null) {
    req.query.area_min = '0';
  }
  if (req.query.area_max == null) {
    req.query.area_max = '';
  }
  if (req.query.price_min == null) {
    req.query.price_min = '1';
  }
  if (req.query.price_max == null) {
    req.query.price_max = '';
  }
  if (req.query.bedrooms == null || req.query.bedrooms.toString().toLowerCase() === 'all') {
    req.query.bedrooms = '';
  }
  if (req.query.start_date == null) {
    req.query.start_date = '';
  }
  if (req.query.end_date == null) {
    req.query.end_date = '';
  }

  const { property_type, area_min, area_max, price_min, price_max, bedrooms, start_date, end_date } = req.query as {
    property_type: string;
    area_min: string;
    area_max: string;
    price_min: string;
    price_max: string;
    bedrooms: string;
    start_date: string;
    end_date: string;
  };

  switch (true) {
    case isNaN(Number(price_min)) || Number(price_min) < 0:
    case price_max && (isNaN(Number(price_max)) || Number(price_max) < 0):
      return res.status(400).json({ message: 'Invalid price parameters. Both price_min and price_max must be valid numbers.' });
    case bedrooms && bedrooms.split(',').some(v => isNaN(Number(v))):
      return res.status(400).json({ message: 'Invalid bedrooms parameter. It must be a valid number.' });
    case isNaN(Number(area_min)) || Number(area_min) < 0:
    case area_max && (isNaN(Number(area_max)) || Number(area_max) < 0):
      return res.status(400).json({ message: 'Invalid area parameters. Both area_min and area_max must be valid numbers (in square feet).' });
    case start_date && isNaN(Date.parse(start_date)):
      return res.status(400).json({ message: 'Invalid start_date parameter. It must be a valid date in iso string format.' });
    case end_date && isNaN(Date.parse(end_date)):
      return res.status(400).json({ message: 'Invalid end_date parameter. It must be a valid date in iso string format.' });
    case property_type != '': {
      const PROPERTY_TYPES = await getPropertyTypes();
      return res.status(400).json({ message: `Invalid property_type parameter. It must be one of following: ${PROPERTY_TYPES.join(', ')}` });
    }
  }
  next();
};

export const validatePropertyId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.query as { id: string };
  if (isNaN(Number(id))) {
    res.status(400).json({ message: 'Invalid property id parameter. It must be a valid number.' });
  } else {
    next();
  }
};

export const validatePurposeFilter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { purpose = '' } = req.query as { purpose: string };
    const dbPurpose = await getPropertyPurpose();
    if (!dbPurpose.map(v => v.toLowerCase()).includes(purpose.toLowerCase())) {
      return res.status(400).json({ message: `Invalid purpose parameter. It must be one of following: ${dbPurpose.join(',')}.` });
    }
    next();
  } catch (err) {
    next(err);
  }
};
