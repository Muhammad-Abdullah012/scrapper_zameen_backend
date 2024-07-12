import Container, { Service } from 'typedi';
import { pgPool } from '@config/sequelize';
import { POPULARITY_TREND_URL, AREA_TREND_URL, CONTACT_URL } from '@config/index';
import {
  AVAILABLE_CITIES,
  IConstructBaseQueryProps,
  IFindAllPropertiesProps,
  IGetPropertiesCountMapProps,
  IProperty,
  ISearchPropertiesProps,
  SORT_COLUMNS,
  SORT_ORDER,
} from '@/types';
import { getPropertyTypes } from '@/utils/helpers';
import { logger } from '@/utils/logger';
import axios, { AxiosResponse } from 'axios';
import { RedisService } from './redis.service';

@Service()
export class PropertyService {
  private redis = Container.get(RedisService);
  private validateSortParams(sort_by: SORT_COLUMNS, sort_order: SORT_ORDER) {
    if (!Object.values(SORT_COLUMNS).includes(sort_by)) {
      throw new Error('Invalid sort_by column');
    }
    if (!Object.values(SORT_ORDER).includes(sort_order)) {
      throw new Error('Invalid sort_order');
    }
  }

  private selectAllProperties(): string {
    const properties: (keyof IProperty)[] = [
      'id',
      'desc',
      'header',
      'type',
      'price',
      'cover_photo_url',
      'available',
      'area',
      'location',
      'added',
      'bedroom',
      'bath',
    ];
    return properties.map(property => `"${property}"`).join(',');
  }

  private async mapPropertiesDetails(properties: IProperty[]) {
    const promises = await Promise.allSettled(
      properties.map(async (property: IProperty) => {
        const externalId = property?.url?.split('-').slice(-3)[0];
        const [popularity_trends, area_trends, contact] = await Promise.allSettled([
          axios.get(`${POPULARITY_TREND_URL}${externalId}`),
          axios.get(`${AREA_TREND_URL}${externalId}`),
          axios.get(`${CONTACT_URL}${externalId}`),
        ]);
        const formatResponse = (response: PromiseSettledResult<AxiosResponse>) => {
          if (response.status === 'fulfilled') {
            return response.value.data;
          }
          return null;
        };
        return {
          ...property,
          popularity_trends: formatResponse(popularity_trends),
          area_trends: formatResponse(area_trends),
          external_id: externalId,
          contact: formatResponse(contact),
        };
      }),
    );
    return promises.map(promise => (promise.status === 'fulfilled' ? promise.value : null)).filter(v => v != null);
  }
  private async getTotalCount(baseQuery: string, replacements: string[]): Promise<number> {
    const countQuery = `SELECT COUNT(*) as total ${baseQuery};`;
    const cacheKey = `getTotalCount:${Buffer.from(countQuery + JSON.stringify(replacements)).toString('base64')}`;
    const cachedResult = await this.redis.getRedisValue(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult)[0]['total'];
    }
    const countResult = (await pgPool.query(countQuery, replacements)).rows;
    this.redis.setRedisValue({ key: cacheKey, value: JSON.stringify(countResult) });
    return countResult[0]['total'];
  }

  private async getTotalCountGroupedByTypes(baseQuery: string, replacements: string[]): Promise<{ [key: string]: number }> {
    const countQuery = `SELECT type, COUNT(*) as total ${baseQuery} GROUP BY type;`;
    const cacheKey = `getTotalCountGroupedByTypes:${Buffer.from(countQuery + JSON.stringify(replacements)).toString('base64')}`;
    const cachedResult = await this.redis.getRedisValue(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
    const countResult = await pgPool.query(countQuery, replacements);
    const map = countResult.rows.reduce<{ [key: string]: number }>((map, row: { type: string; total: number }) => {
      map[row.type] = row.total;
      return map;
    }, {});
    this.redis.setRedisValue({ key: cacheKey, value: JSON.stringify(map) });
    return map;
  }
  private constructBaseQuery({
    city,
    search,
    property_types = [],
    bedrooms,
    price_min,
    price_max,
    area_min,
    area_max,
    start_date,
    end_date,
    purpose,
  }: IConstructBaseQueryProps): { baseQuery: string; replacements: string[]; index: number } {
    let baseQuery = `FROM property_v2 WHERE 1=1 `;
    const replacements: string[] = [];
    let index = 1;
    if (city) {
      baseQuery += `AND location ILIKE $${index++} `;
      replacements.push(`%${city}%`);
    }

    if (search) {
      baseQuery += `AND (header ILIKE $${index} OR location ILIKE $${index} OR bath ILIKE $${index} OR purpose ILIKE $${index} OR initial_amount ILIKE $${index} OR monthly_installment ILIKE $${index} OR remaining_installments ILIKE $${index}) `;
      replacements.push(`%${search}%`);
      ++index;
    }

    if (property_types.length > 0) {
      baseQuery += `AND type IN (${property_types.map(() => `$${index++}`)}) `;
      replacements.push(...property_types);
    }

    if (bedrooms) {
      baseQuery += `AND bedroom IN (${bedrooms.split(',').map(() => `$${index++}`)}) `;
      replacements.push(...bedrooms.split(',').map(v => `${v} Bed`));
    }

    if (price_min) {
      baseQuery += `AND price >= $${index++} `;
      replacements.push(price_min);
    }

    if (price_max) {
      baseQuery += `AND price <= $${index++} `;
      replacements.push(price_max);
    }

    if (area_min) {
      baseQuery += `AND (
          CASE 
            WHEN area ILIKE '%kanal%' THEN CAST(REPLACE(SPLIT_PART(area, ' ', 1), ',', '') AS double precision) * 4500
            WHEN area ILIKE '%marla%' THEN CAST(REPLACE(SPLIT_PART(area, ' ', 1), ',', '') AS double precision) * 225
            WHEN area ILIKE '%sq. yd.%' THEN CAST(REPLACE(SPLIT_PART(area, ' ', 1), ',', '') AS double precision) * 9
            ELSE 0
          END
        )`;
      baseQuery += ` >= $${index++} `;
      replacements.push(area_min);
    }

    if (area_max) {
      baseQuery += `AND (
          CASE 
            WHEN area ILIKE '%kanal%' THEN CAST(REPLACE(SPLIT_PART(area, ' ', 1), ',', '') AS double precision) * 4500
            WHEN area ILIKE '%marla%' THEN CAST(REPLACE(SPLIT_PART(area, ' ', 1), ',', '') AS double precision) * 225
            WHEN area ILIKE '%sq. yd.%' THEN CAST(REPLACE(SPLIT_PART(area, ' ', 1), ',', '') AS double precision) * 9
            ELSE 0
          END
        )`;
      baseQuery += ` <= $${index++} `;
      replacements.push(area_max);
    }
    const MILLISECONDS_PER_SECOND = 1000;
    if (start_date) {
      baseQuery += `AND added >= $${index++} `;
      replacements.push((Date.parse(start_date) / MILLISECONDS_PER_SECOND).toString());
    }

    if (end_date) {
      baseQuery += `AND added < $${index++} `;
      replacements.push((Date.parse(end_date) / MILLISECONDS_PER_SECOND).toString());
    }

    if (purpose) {
      baseQuery += `AND purpose ILIKE $${index++} `;
      replacements.push(`%${purpose}%`);
    }

    return { baseQuery, replacements, index };
  }
  public async findAllProperties({
    city,
    page_number,
    page_size = 10,
    sort_by = SORT_COLUMNS.ID,
    sort_order = SORT_ORDER.ASC,
    purpose,
  }: IFindAllPropertiesProps): Promise<any> {
    this.validateSortParams(sort_by, sort_order);

    const { baseQuery, replacements, index } = this.constructBaseQuery({ city, purpose });

    const totalCountPromise = this.getTotalCount(baseQuery, replacements);

    const offset = (page_number - 1) * page_size;

    const query = `SELECT ${this.selectAllProperties()} ${baseQuery} ORDER BY ${sort_by} ${sort_order} LIMIT $${index} OFFSET $${index + 1}`;

    const propertiesPromise = pgPool.query<IProperty>(query, [...replacements, page_size.toString(), offset.toString()]);

    const [propertiesResult, totalCountResult] = await Promise.allSettled([propertiesPromise, totalCountPromise]);

    if (propertiesResult.status === 'rejected') {
      logger.error(`Error fetching properties: ${propertiesResult.reason}`);
    }
    if (totalCountResult.status === 'rejected') {
      logger.error(`Error fetching total count: ${totalCountResult.reason}`);
    }
    const properties = propertiesResult.status === 'fulfilled' ? propertiesResult.value.rows : [];
    const totalCount = totalCountResult.status === 'fulfilled' ? totalCountResult.value : 0;

    return { properties, total_count: totalCount };
  }
  public async findPropertyById(propertyId: number, fields: string = '*', mapped = true) {
    const property = (await pgPool.query<IProperty>(`SELECT ${fields} FROM property_v2 WHERE id = $1`, [propertyId])).rows;

    return mapped ? this.mapPropertiesDetails(property) : property;
  }

  public async availableCitiesData() {
    return Object.values(AVAILABLE_CITIES);
  }
  public async getPropertiesCountMap({
    city,
    search,
    area_min,
    area_max,
    price_min,
    price_max,
    bedrooms,
    start_date,
    end_date,
    purpose,
  }: IGetPropertiesCountMapProps) {
    const propertyTypes = await getPropertyTypes();

    const { baseQuery, replacements } = this.constructBaseQuery({
      city,
      search,
      property_types: propertyTypes,
      bedrooms,
      price_min,
      price_max,
      area_min,
      area_max,
      start_date,
      end_date,
      purpose,
    });
    return this.getTotalCountGroupedByTypes(baseQuery, replacements);
  }

  public async autoCompleteLocation(search: string) {
    const query = `SELECT DISTINCT location FROM property_v2 WHERE location ILIKE $1 LIMIT 10`;
    return (await pgPool.query<{ location: string }>(query, [`%${search}%`])).rows.map(row => row.location);
  }

  public async searchProperties({
    city,
    search,
    page_number,
    page_size = 10,
    sort_by = SORT_COLUMNS.ID,
    sort_order = SORT_ORDER.ASC,
    property_type,
    area_min,
    area_max,
    price_min,
    price_max,
    bedrooms,
    start_date,
    end_date,
    purpose,
  }: ISearchPropertiesProps): Promise<any> {
    this.validateSortParams(sort_by, sort_order);

    const { baseQuery, replacements, index } = this.constructBaseQuery({
      city,
      search,
      property_types: property_type ? [property_type] : [],
      bedrooms,
      price_min,
      price_max,
      area_min,
      area_max,
      start_date,
      end_date,
      purpose,
    });
    const totalCountPromise = this.getTotalCount(baseQuery, replacements);

    const offset = (page_number - 1) * page_size;

    const query = `SELECT ${this.selectAllProperties()} ${baseQuery} ORDER BY ${sort_by} ${sort_order} LIMIT $${index} OFFSET $${index + 1}`;

    const propertiesPromise = pgPool.query<IProperty>(query, [...replacements, page_size.toString(), offset.toString()]);
    const getPropertiesCountMapPromise = this.getPropertiesCountMap({
      city,
      search,
      area_min,
      area_max,
      price_min,
      price_max,
      bedrooms,
      start_date,
      end_date,
      purpose,
    });

    const [propertiesResult, propertiesMapResult, totalCountResult] = await Promise.allSettled([
      propertiesPromise,
      getPropertiesCountMapPromise,
      totalCountPromise,
    ]);
    if (propertiesResult.status === 'rejected') {
      logger.error(`Error fetching properties: ${propertiesResult.reason}`);
    }
    if (propertiesMapResult.status === 'rejected') {
      logger.error(`Error fetching properties map: ${propertiesMapResult.reason}`);
    }
    if (totalCountResult.status === 'rejected') {
      logger.error(`Error fetching total count: ${totalCountResult.reason}`);
    }
    const properties = propertiesResult.status === 'fulfilled' ? propertiesResult.value.rows : [];
    const propertiesMap = propertiesMapResult.status === 'fulfilled' ? propertiesMapResult.value : {};
    const totalCount = totalCountResult.status === 'fulfilled' ? totalCountResult.value : 0;
    return {
      properties,
      total_count: totalCount,
      property_count_map: propertiesMap,
    };
  }
}
