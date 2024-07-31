import { Response } from 'express';
import { PROPERTY_TYPE_CATEGORIES } from '@/constants';

export const isInvalidNumber = (value: string): boolean => {
  const num = Number(value);
  return isNaN(num) || num < 0 || !isFinite(num);
};

export const PROPERTY_CATEGORY_MAP: { [key in PROPERTY_TYPE_CATEGORIES]: string } = {
  [PROPERTY_TYPE_CATEGORIES.HOME]: ['house', 'upper_portion', 'lower_portion', 'flat', 'room', 'farm_house', 'penthouse'].join(','),
  [PROPERTY_TYPE_CATEGORIES.PLOT]: ['residential_plot', 'commercial_plot', 'industrial_land', 'agricultural_land', 'plot_file', 'plot_form'].join(
    ',',
  ),
  [PROPERTY_TYPE_CATEGORIES.COMMERCIAL]: ['shop', 'office', 'warehouse', 'factory', 'building', 'other'].join(','),
};

export const returnBadRequestError = ({ res, message }: { res: Response; message: string }) => res.status(400).json({ message });
