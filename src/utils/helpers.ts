import { sequelize } from '@/config/sequelize';
import { Property } from '@/models/models';

export const getPropertyTypes = async () => {
  const result = await Property.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('type')), 'type']],
  });
  const propertyTypes = result.map(item => item?.['type']).filter(item => item != null);
  return propertyTypes;
};

export const getPropertyPurpose = async () => {
  const result = await Property.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('purpose')), 'purpose']],
  });
  const propertyPurpose = result.map(item => item?.['purpose']).filter(item => item != null);
  return propertyPurpose;
};
