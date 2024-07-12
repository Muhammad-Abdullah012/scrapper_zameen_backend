import { Container } from 'typedi';
import { NextFunction, Request, Response } from 'express';
import { PropertyService } from '@/services/property.service';
import { SORT_COLUMNS, SORT_ORDER } from '@/types';
import { FEATURED_PROPERTY_PRICE_THRESHOLD } from '@config/index';

export class PropertyController {
  public property = Container.get(PropertyService);

  public getProperties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page_size, page_number, sort_by, sort_order, purpose } = req.query as {
        page_size: string;
        page_number: string;
        sort_by: SORT_COLUMNS;
        sort_order: SORT_ORDER;
        purpose: string;
      };
      const city = req.params.city;
      const findAllPropertiesData = await this.property.findAllProperties({
        city,
        page_number: Number(page_number),
        page_size: Number(page_size),
        sort_by,
        sort_order,
        purpose,
      });
      res.status(200).json({ data: { ...findAllPropertiesData, page_number, page_size }, message: 'findAll' });
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
      const { query, area_min, area_max, price_min, price_max, bedrooms, start_date, end_date, purpose } = req.query as {
        query: string;
        area_min: string;
        area_max: string;
        price_min: string;
        price_max: string;
        bedrooms: string;
        start_date: string;
        end_date: string;
        purpose: string;
      };
      const propertyCount = await this.property.getPropertiesCountMap({
        city: req.params.city,
        search: query,
        area_min,
        area_max,
        price_min,
        price_max,
        bedrooms,
        start_date,
        end_date,
        purpose,
      });
      res.status(200).json({ data: propertyCount, message: 'count' });
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
  public searchProperties = async (req: Request, res: Response, next: NextFunction) => {
    const {
      query,
      page_number,
      page_size,
      sort_by,
      sort_order,
      property_type,
      area_min,
      area_max,
      price_min,
      price_max,
      bedrooms,
      start_date,
      end_date,
      purpose,
    } = req.query as {
      query: string;
      page_number: string;
      page_size: string;
      sort_by: SORT_COLUMNS;
      sort_order: SORT_ORDER;
      property_type: string;
      area_min: string;
      area_max: string;
      price_min: string;
      price_max: string;
      bedrooms: string;
      start_date: string;
      end_date: string;
      purpose: string;
    };

    try {
      const properties = await this.property.searchProperties({
        city: req.params.city,
        search: query,
        page_number: Number(page_number),
        page_size: Number(page_size),
        sort_by: sort_by as SORT_COLUMNS,
        sort_order: sort_order as SORT_ORDER,
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
        data: { ...properties, page_number, page_size },
        message: 'search-properties',
      });
    } catch (error) {
      next(error);
    }
  };
  public getFeaturedProperties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page_number, page_size, purpose } = req.query as {
        page_number: string;
        page_size: string;
        purpose: string;
      };
      const featuredProperties = await this.property.searchProperties({
        page_number: Number(page_number),
        page_size: Number(page_size),
        sort_by: SORT_COLUMNS.PRICE,
        price_min: FEATURED_PROPERTY_PRICE_THRESHOLD,
        purpose,
      });
      res.status(200).json({ data: { ...featuredProperties, page_number, page_size }, message: 'featured-properties' });
    } catch (error) {
      next(error);
    }
  };
  public getSimilarProperties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page_number, page_size, id, purpose } = req.query as {
        id: string;
        page_size: string;
        page_number: string;
        purpose: string;
      };
      const property = await this.property.findPropertyById(Number(id), 'type, location', false);
      const similarProperties = await this.property.searchProperties({
        page_number: Number(page_number),
        page_size: Number(page_size),
        sort_by: SORT_COLUMNS.ID,
        search: property[0].location,
        property_type: property[0].type,
        purpose,
      });
      res.status(200).json({ data: { ...similarProperties, page_number, page_size }, message: 'similar-properties' });
    } catch (error) {
      next(error);
    }
  };
  public autoCompleteLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query = '' } = req.query as { query: string };
      const autoCompleteLocations = await this.property.autoCompleteLocation(query);
      res.status(200).json({ data: autoCompleteLocations, message: 'auto-complete-locations' });
    } catch (error) {
      next(error);
    }
  };
}
