import { PropertyPurposeType, PropertyType } from '@/models/models';
import { BooleanStr, SORT_COLUMNS, SORT_ORDER } from '.';

export interface IGetPropertiesQueryParams {
  page_size: string;
  page_number: string;
  sort_by: SORT_COLUMNS;
  sort_order: SORT_ORDER;
  purpose: string;
}

export interface IGetPropertyCountQueryParams {
  location_ids: string;
  area_min: string;
  area_max: string;
  price_min: string;
  price_max: string;
  bedrooms: string;
  start_date: string;
  end_date: string;
  purpose: string;
}

export interface ISearchPropertiesQueryParams {
  location_ids: string;
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
  is_posted_by_agency: BooleanStr;
}

export interface IGetFeaturedPropertiesQueryParams {
  page_number: string;
  page_size: string;
  purpose: string;
}

export interface IGetSimilarPropertiesQueryParams {
  id: string;
  page_size: string;
  page_number: string;
  purpose: string;
}

export interface IGetBestPropertiesQueryParams {
  area_min: string;
  area_max: string;
  page_size: string;
  page_number: string;
  location_ids: string;
  property_type: PropertyType;
  purpose: PropertyPurposeType;
}

export interface IgetMaxPriceChangePercentageLastYearQueryParams {
  area?: string;
  limit: number;
  purpose: string;
  year_count: number;
  location_ids: string;
  sort_order?: SORT_ORDER;
  property_type: PropertyType;
}

export interface IgetPriceChangePercentageDataQueryParams {
  area?: string;
  limit: number;
  purpose: string;
  page_size: number;
  year_count: number;
  page_number: number;
  location_ids: string;
  sort_order?: SORT_ORDER;
  property_type: PropertyType;
}
