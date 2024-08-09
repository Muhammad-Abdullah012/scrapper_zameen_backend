import { z } from 'zod';
import { Request } from 'express';
import { type FeatureSchema, type PropertySchema } from '@/models/property.schema';
import { PropertyPurposeType, PropertyType } from '@/models/models';

export interface IRequestWithSortingParams extends Request {
  order: SortingOrder;
}

export type SortingOrder = [SORT_COLUMNS, SORT_ORDER][];

export enum SORT_ORDER {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum SORT_COLUMNS {
  PRICE = 'price',
  ID = 'id',
  ADDED = 'added',
}

export enum AVAILABLE_CITIES {
  ISLAMABAD = 'islamabad',
  RAWALPINDI = 'rawalpindi',
  LAHORE = 'lahore',
  KARACHI = 'karachi',
}

export type IProperty = z.infer<typeof PropertySchema>;
export type IFeature = z.infer<typeof FeatureSchema>;

export interface ISearchPropertiesProps {
  city?: string;
  location_ids?: string;
  page_number: number;
  page_size?: number;
  sorting_order?: SortingOrder;
  property_type?: string;
  area_min?: string;
  area_max?: string;
  price_min?: string;
  price_max?: string;
  bedrooms?: string;
  start_date?: string;
  end_date?: string;
  purpose?: string;
}

export interface IGetPropertiesCountMapProps {
  city?: string;
  location_ids: string;
  area_min?: string;
  area_max?: string;
  price_min?: string;
  price_max?: string;
  bedrooms?: string;
  start_date?: string;
  end_date?: string;
  purpose?: string;
}

export interface IConstructBaseQueryProps {
  city?: string;
  search?: string;
  property_types?: string[];
  bedrooms?: string;
  price_min?: string;
  price_max?: string;
  area_min?: string;
  area_max?: string;
  start_date?: string;
  end_date?: string;
  purpose?: string;
}

export interface IFindAllPropertiesProps {
  city?: string;
  page_number: number;
  page_size?: number;
  sorting_order?: SortingOrder;
  purpose?: string;
}

export interface IGetWhereClauseProps {
  city?: string;
  location_ids?: string;
  area_min?: string;
  area_max?: string;
  price_min?: string;
  price_max?: string;
  bedrooms?: string;
  start_date?: string;
  end_date?: string;
  purpose?: string;
  property_type?: string;
}

export interface IGetBestPropertiesProps {
  city?: string;
  limit?: number;
  area_min?: string;
  area_max?: string;
  page_size: number;
  page_number: number;
  location_ids?: string;
  property_type?: PropertyType;
  purpose?: PropertyPurposeType;
}

// export interface IProperty {
//   id: number;
//   desc: string;
//   header: string;
//   type: string;
//   price: number;
//   location: string;
//   bath: string;
//   area: string;
//   purpose: string;
//   bedroom: string;
//   added: number;
//   initial_amount: string;
//   monthly_installment: string;
//   remaining_installments: string;
//   url: string;
//   created_at: string;
//   updated_at: string;
//   cover_photo_url: string;
//   available: boolean;
//   features: IFeature[];
// }

// export interface IFeature {
//   category: string;
//   features: string[];
// }
