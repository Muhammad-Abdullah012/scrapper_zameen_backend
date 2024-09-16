import { sequelize } from '@/config/sequelize';
import { Property, PropertyPurposeType, PropertyType } from '@/models/models';

const cachedData: { propertyTypes: PropertyType[] | null; propertyPurpose: PropertyPurposeType[] | null } = {
  propertyPurpose: null,
  propertyTypes: null,
};

export const getPropertyTypes = async () => {
  if (cachedData['propertyTypes']) return cachedData['propertyTypes'];
  const result = await Property.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('type')), 'type']],
  });
  const propertyTypes = result.map(item => item?.['type']).filter(item => item != null);
  cachedData['propertyTypes'] = propertyTypes;
  return propertyTypes;
};

export const getPropertyPurpose = async () => {
  if (cachedData['propertyPurpose']) return cachedData['propertyPurpose'];
  const result = await Property.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('purpose')), 'purpose']],
  });
  const propertyPurpose = result.map(item => item?.['purpose']).filter(item => item != null);
  cachedData['propertyPurpose'] = propertyPurpose;
  return propertyPurpose;
};
