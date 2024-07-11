import Container from 'typedi';
import { pgPool } from '@/config/sequelize';
import { RedisService } from '@/services/redis.service';

export const getPropertyTypes = async () => {
  return (await pgPool.query('SELECT DISTINCT type FROM property_v2;')).rows.map(item => item?.['type']).filter(item => item != null);
};

export const getPropertyPurpose = async () => {
  const redis = Container.get(RedisService);
  const query = 'SELECT DISTINCT purpose FROM property_v2;';
  const redisValue = await redis.getRedisValue(query);
  if (redisValue) {
    return JSON.parse(redisValue);
  }
  const propertyPurpose = (await pgPool.query<{ purpose: string }>(query)).rows.map(item => item?.['purpose']).filter(item => item != null);
  await redis.setRedisValue({ key: query, value: JSON.stringify(propertyPurpose) });
  return propertyPurpose;
};
