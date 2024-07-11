import { pgPool } from '@/config/sequelize';

export const getPropertyTypes = async () => {
  return (await pgPool.query('SELECT DISTINCT type FROM property_v2;')).rows.map(item => item?.['type']).filter(item => item != null);
};

export const getPropertyPurpose = async () => {
  return (await pgPool.query<{ purpose: string }>('SELECT DISTINCT purpose FROM property_v2;')).rows
    .map(item => item?.['purpose'])
    .filter(item => item != null);
};
