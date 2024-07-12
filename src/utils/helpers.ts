import Container from 'typedi';
import { pgPool } from '@/config/sequelize';
import { RedisService } from '@/services/redis.service';

export const getPropertyTypes = async () => {
  const redis = Container.get(RedisService);
  const query = 'SELECT DISTINCT type FROM property_v2;';
  const cacheKey = `getPropertyTypes:${Buffer.from(query).toString('base64')}`;
  const redisValue = await redis.getRedisValue(cacheKey);
  if (redisValue) {
    return JSON.parse(redisValue);
  }
  const propertyTypes = (await pgPool.query(query)).rows.map(item => item?.['type']).filter(item => item != null);
  redis.setRedisValue({ key: cacheKey, value: JSON.stringify(propertyTypes) });
  return propertyTypes;
};

export const getPropertyPurpose = async () => {
  const redis = Container.get(RedisService);
  const query = 'SELECT DISTINCT purpose FROM property_v2;';
  const cacheKey = `getPropertyPurpose:${Buffer.from(query).toString('base64')}`;
  const redisValue = await redis.getRedisValue(cacheKey);
  if (redisValue) {
    return JSON.parse(redisValue);
  }
  const propertyPurpose = (await pgPool.query<{ purpose: string }>(query)).rows.map(item => item?.['purpose']).filter(item => item != null);
  redis.setRedisValue({ key: cacheKey, value: JSON.stringify(propertyPurpose) });
  return propertyPurpose;
};
