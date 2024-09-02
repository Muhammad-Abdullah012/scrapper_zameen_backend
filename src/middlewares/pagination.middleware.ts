import { IRequestWithSortingParams, SORT_COLUMNS, SORT_ORDER } from '@/types';
import { IvalidatePaginationParamsMiddlewareQueryParams } from '@/types/middleware.interfaces';
import { isInvalidNumber, returnBadRequestError } from '@/utils/validation.helpers';
import { parseSortParams } from '@/utils/pagination.helpers';
import { Request, Response, NextFunction } from 'express';

// Middleware to validate page_size and page_number
export const validatePaginationParamsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { query } = req;
  query.page_size = query.page_size || '10';
  query.page_number = query.page_number || '1';
  const { page_size, page_number } = query as unknown as IvalidatePaginationParamsMiddlewareQueryParams;
  if (isInvalidNumber(page_number, 1) || isInvalidNumber(page_size, 1)) {
    return returnBadRequestError({ res, message: 'Invalid pagination parameters. Both page_size and page_number must be valid numbers.' });
  }
  next();
};

export const validateSortParamsMiddleware = (req: IRequestWithSortingParams, res: Response, next: NextFunction) => {
  try {
    const { query } = req;
    query.sort_by = query.sort_by || SORT_COLUMNS.ID;
    query.sort_order = query.sort_order || SORT_ORDER.ASC;
    const { sort_by, sort_order } = query as { sort_by: string; sort_order: string };
    req.order = parseSortParams(sort_by, sort_order);
    next();
  } catch (err) {
    next(err);
  }
};
