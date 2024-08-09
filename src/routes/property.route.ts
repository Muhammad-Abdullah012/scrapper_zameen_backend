import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import { PropertyController } from '@/controllers/property.controller';
import {
  validateCityParam,
  validateSearchQueryParamMiddleware,
  validateSearchFiltersMiddleware,
  validatePropertyId,
  validatePurposeFilter,
  validatePropertyTypeFilter,
  validateAreaFilter,
} from '@/middlewares/validation.middleware';
import { validatePaginationParamsMiddleware, validateSortParamsMiddleware } from '@/middlewares/pagination.middleware';

export class PropertyRoute implements Routes {
  public path = '/property';
  public router: Router = Router();
  public property = new PropertyController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      `${this.path}`,
      validatePaginationParamsMiddleware,
      validateSortParamsMiddleware,
      validatePurposeFilter,
      this.property.getProperties,
    );
    this.router.get(`${this.path}/suggestions`, this.property.autoCompleteLocations);
    this.router.get(
      `${this.path}/count`,
      validateSearchQueryParamMiddleware,
      validateSearchFiltersMiddleware,
      validatePropertyTypeFilter,
      validatePurposeFilter,
      validateAreaFilter,
      this.property.getPropertyCount,
    );
    this.router.get(`${this.path}/available-cities`, this.property.getAvailableCities);
    this.router.get(`${this.path}/featured`, validatePaginationParamsMiddleware, validatePurposeFilter, this.property.getFeaturedProperties);
    this.router.get(
      `${this.path}/similar`,
      validatePaginationParamsMiddleware,
      validatePropertyId,
      validatePurposeFilter,
      this.property.getSimilarProperties,
    );
    this.router.get(
      `${this.path}/search`,
      validateSearchQueryParamMiddleware,
      validatePaginationParamsMiddleware,
      validateSortParamsMiddleware,
      validateSearchFiltersMiddleware,
      validatePropertyTypeFilter,
      validatePurposeFilter,
      validateAreaFilter,
      this.property.searchProperties,
    );
    this.router.get(
      `${this.path}/best`,
      validateAreaFilter,
      validatePurposeFilter,
      validatePropertyTypeFilter,
      validateSearchQueryParamMiddleware,
      validatePaginationParamsMiddleware,
      this.property.getBestProperties,
    );
    this.router.get(
      `${this.path}/best/:city`,
      validateCityParam,
      validateAreaFilter,
      validatePurposeFilter,
      validatePropertyTypeFilter,
      validateSearchQueryParamMiddleware,
      validatePaginationParamsMiddleware,
      this.property.getBestProperties,
    );
    this.router.get(`${this.path}/:id(\\d+)`, this.property.getPropertyById);
    this.router.get(`${this.path}/suggestions/:city`, validateCityParam, this.property.autoCompleteLocations);
    this.router.get(
      `${this.path}/count/:city`,
      validateCityParam,
      validateSearchQueryParamMiddleware,
      validateSearchFiltersMiddleware,
      validatePropertyTypeFilter,
      validatePurposeFilter,
      validateAreaFilter,
      this.property.getPropertyCount,
    );
    this.router.get(
      `${this.path}/search/:city`,
      validateSearchQueryParamMiddleware,
      validatePaginationParamsMiddleware,
      validateSortParamsMiddleware,
      validateCityParam,
      validateSearchFiltersMiddleware,
      validatePropertyTypeFilter,
      validatePurposeFilter,
      validateAreaFilter,
      this.property.searchProperties,
    );
    this.router.get(
      `${this.path}/:city`,
      validatePaginationParamsMiddleware,
      validateSortParamsMiddleware,
      validateCityParam,
      validatePurposeFilter,
      this.property.getProperties,
    );
  }
}
