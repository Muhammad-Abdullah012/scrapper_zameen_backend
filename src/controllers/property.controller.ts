import { Container } from 'typedi';
import { NextFunction, Request, Response } from 'express';
import { PropertyService } from '@/services/property.service';
import { IRequestWithSortingParams, SORT_COLUMNS, SORT_ORDER } from '@/types';
import {
  IGetBestPropertiesQueryParams,
  IGetFeaturedPropertiesQueryParams,
  IgetMaxPriceChangePercentageLastYearQueryParams,
  IgetPriceChangePercentageDataQueryParams,
  IGetPropertiesQueryParams,
  IGetPropertyCountQueryParams,
  IGetSimilarPropertiesQueryParams,
  ISearchPropertiesQueryParams,
} from '@/types/controller.interfaces';
import { PropertyPurposeType, PropertyType } from '@/models/models';

export class PropertyController {
  public property = Container.get(PropertyService);

  public getProperties = async (req: IRequestWithSortingParams, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query, params, order } = req;
      const { page_size, page_number, purpose } = query as unknown as IGetPropertiesQueryParams;
      const { rows: properties, count: total_count } = await this.property.findAllProperties({
        city: params.city,
        page_number: Number(page_number),
        page_size: Number(page_size),
        sorting_order: order,
        purpose,
      });
      res.status(200).json({ data: { properties, total_count, page_number, page_size }, message: 'findAll' });
    } catch (error) {
      next(error);
    }
  };
  public getPropertyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const propertyId = Number(req.params.id);
      const property = await this.property.findPropertyById(propertyId);
      res.status(200).json({ data: property, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };
  public getPropertyCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query, params } = req;
      const { location_ids, area_min, area_max, price_min, price_max, bedrooms, start_date, end_date, purpose } =
        query as unknown as IGetPropertyCountQueryParams;
      const propertyCount = await this.property.getPropertiesCountMap({
        city: params.city,
        location_ids,
        area_min,
        area_max,
        price_min,
        price_max,
        bedrooms,
        start_date,
        end_date,
        purpose,
      });

      const propertyCountMap = propertyCount.reduce((acc, item: any) => {
        acc[item.type as string] = item.count;
        return acc;
      }, {});

      res.status(200).json({
        data: propertyCountMap,
        message: 'count',
      });
    } catch (error) {
      next(error);
    }
  };
  public getAvailableCities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cities = await this.property.availableCitiesData();
      res.status(200).json({ data: cities, message: 'available-cities' });
    } catch (error) {
      next(error);
    }
  };
  public searchProperties = async (req: IRequestWithSortingParams, res: Response, next: NextFunction) => {
    const { query, params, order } = req;
    const {
      location_ids,
      page_number,
      page_size,
      property_type,
      area_min,
      area_max,
      price_min,
      price_max,
      bedrooms,
      start_date,
      end_date,
      purpose,
      is_posted_by_agency,
    } = query as unknown as ISearchPropertiesQueryParams;

    try {
      const { rows: properties, count: total_count } = await this.property.searchProperties({
        city: params.city,
        location_ids,
        page_number: Number(page_number),
        page_size: Number(page_size),
        is_posted_by_agency,
        sorting_order: order,
        property_type,
        area_min,
        area_max,
        price_min,
        price_max,
        bedrooms,
        start_date,
        end_date,
        purpose,
      });

      res.json({
        data: { properties, total_count, page_number, page_size },
        message: 'search-properties',
      });
    } catch (error) {
      next(error);
    }
  };
  public getFeaturedProperties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page_number, page_size, purpose } = req.query as unknown as IGetFeaturedPropertiesQueryParams;
      const { rows: properties, count: total_count } = await this.property.getFeaturedProperties({
        purpose,
        page_size: Number(page_size),
        page_number: Number(page_number),
        sorting_order: [[SORT_COLUMNS.PRICE, SORT_ORDER.DESC]],
      });
      res.status(200).json({ data: { properties, total_count, page_number, page_size }, message: 'featured-properties' });
    } catch (error) {
      next(error);
    }
  };
  public getSimilarProperties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page_number, page_size, id, purpose } = req.query as unknown as IGetSimilarPropertiesQueryParams;
      const property = await this.property.findPropertyById(Number(id));
      const { rows: properties, count: total_count } = await this.property.searchProperties({
        page_number: Number(page_number),
        page_size: Number(page_size),
        location_ids: String(property[0].location_id),
        property_type: property[0].type,
        purpose,
      });
      res.status(200).json({ data: { properties, total_count, page_number, page_size }, message: 'similar-properties' });
    } catch (error) {
      next(error);
    }
  };
  public autoCompleteLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query: ReqQuery, params } = req;
      const { query = '' } = ReqQuery as { query: string };
      const autoCompleteLocations = await this.property.autoCompleteLocation(query, params.city);
      res.status(200).json({ data: autoCompleteLocations, message: 'auto-complete-locations' });
    } catch (error) {
      next(error);
    }
  };
  public getBestProperties = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, params } = req;
      const { location_ids, area_max, area_min, purpose, property_type, page_number, page_size } = query as unknown as IGetBestPropertiesQueryParams;
      const { rows: properties, count: total_count } = await this.property.getBestProperties({
        area_max,
        area_min,
        location_ids,
        city: params.city,
        page_size: Number(page_size),
        page_number: Number(page_number),
        purpose: purpose as PropertyPurposeType,
        property_type: property_type as PropertyType,
      });
      res.json({ data: { properties, total_count, page_number, page_size }, message: 'best-properties' });
    } catch (error) {
      next(error);
    }
  };
  public getLocationHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await this.property.getLocationHierarchy();
      res.json({ data: response, message: 'location-hierarchy' });
    } catch (err) {
      next(err);
    }
  };

  public getMaxPriceChangePercentageLastYear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, params } = req;
      const { limit, year_count, purpose, property_type, area, location_ids, sort_order } =
        query as unknown as IgetMaxPriceChangePercentageLastYearQueryParams;
      const { city } = params;

      const result = await this.property.getMaxPriceChangePercentageLastYear({
        area,
        city,
        purpose,
        sort_order,
        location_ids,
        property_type,
        limit: Number(limit),
        year_count: Number(year_count),
      });
      res.json({ data: result, message: `max-price-change-percentage-last-${year_count}-year` });
    } catch (err) {
      next(err);
    }
  };

  public getPriceChangePercentageData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, params } = req;
      const { city } = params;
      const { limit, year_count, purpose, property_type, area, location_ids, sort_order, page_number, page_size } =
        query as unknown as IgetPriceChangePercentageDataQueryParams;

      const result = await this.property.getPriceChangePercentageData({
        area,
        city,
        purpose,
        sort_order,
        location_ids,
        property_type,
        limit: Number(limit),
        page_size: Number(page_size),
        year_count: Number(year_count),
        page_number: Number(page_number),
      });
      res.json({ data: result, message: `price-change-percentage-data-${year_count}-year` });
    } catch (err) {
      next(err);
    }
  };
}
