import { z } from 'zod';

const { object, string, array, number, boolean, date, lazy } = z;

const PropertyPurposeTypeEnum = z.enum(['for_sale', 'for_rent']);
const PropertyTypeEnum = z.enum([
  'agricultural_land',
  'building',
  'commercial_plot',
  'factory',
  'farm_house',
  'flat',
  'house',
  'industrial_land',
  'office',
  'other',
  'penthouse',
  'plot_file',
  'plot_form',
  'residential_plot',
  'room',
  'shop',
  'lower_portion',
  'upper_portion',
  'warehouse',
]);

export const FeatureSchema = object({
  category: string(),
  features: array(string()),
});

export const PropertySchema = object({
  id: number().optional(),
  description: string(),
  header: string(),
  type: PropertyTypeEnum,
  price: number(),
  location_id: number(),
  bath: number(),
  area: number(),
  purpose: PropertyPurposeTypeEnum,
  bedroom: number(),
  added: date(),
  initial_amount: string(),
  monthly_installment: string(),
  remaining_installments: string(),
  url: string().url(),
  created_at: date(),
  updated_at: date(),
  cover_photo_url: string().url(),
  available: boolean(),
  features: array(FeatureSchema),
  city_id: number(),
});

export const PropertyResponseSchema = object({
  id: number(),
  description: string(),
  header: string(),
  type: PropertyTypeEnum,
  price: number(),
  cover_photo_url: string().url(),
  available: boolean(),
  area: number(),
  added: date(),
  bedroom: number(),
  bath: number(),
  location: string(),
  city: string(),
});

export const PropertyDetailResponseSchema = PropertySchema.extend({
  popularity_trends: object({
    trends: object({}),
  }),
  area_trends: object({}),
  external_id: string(),
  contact: object({}),
});

export const LocationHierarchySchema = object({
  id: number(),
  name: string(),
  children: array(lazy(() => LocationHierarchySchema)),
});
