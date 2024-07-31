import { SORT_COLUMNS, SORT_ORDER } from '@/types';
import { IvalidatePaginationParamsMiddlewareQueryParams } from '@/types/middleware.interfaces';
import { isInvalidNumber, returnBadRequestError } from '@/utils/validation.helpers';
import { Request, Response, NextFunction } from 'express';

// Middleware to validate page_size and page_number
export const validatePaginationParamsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.query.page_size = req.query.page_size || '10';
  req.query.page_number = req.query.page_number || '1';
  const { page_size, page_number } = req.query as unknown as IvalidatePaginationParamsMiddlewareQueryParams;
  if (isInvalidNumber(page_number) || isInvalidNumber(page_size)) {
    return returnBadRequestError({ res, message: 'Invalid pagination parameters. Both page_size and page_number must be valid numbers.' });
  }
  next();
};

export const validateSortParamsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.query.sort_by = req.query.sort_by || SORT_COLUMNS.ID;
  req.query.sort_order = req.query.sort_order || SORT_ORDER.ASC;
  const { sort_by, sort_order } = req.query;
  if (!Object.values(SORT_COLUMNS).includes(sort_by as SORT_COLUMNS)) {
    return returnBadRequestError({ res, message: 'sort_by must be one of the following: ' + Object.values(SORT_COLUMNS).join(', ') });
  }
  if (!Object.values(SORT_ORDER).includes(sort_order as SORT_ORDER)) {
    return returnBadRequestError({ res, message: 'sort_order must be one of the following: ' + Object.values(SORT_ORDER).join(', ') });
  }

  next();
};
