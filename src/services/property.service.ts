import Container, { Service } from 'typedi';
import { FindAttributeOptions, InferAttributes, Op, QueryTypes, WhereOptions, col, fn } from 'sequelize';
import { POPULARITY_TREND_URL, AREA_TREND_URL, CONTACT_URL } from '@config/index';
import {
  AVAILABLE_CITIES,
  IFindAllPropertiesProps,
  IGetBestPropertiesProps,
  IGetPropertiesCountMapProps,
  IGetWhereClauseProps,
  ISearchPropertiesProps,
  SORT_COLUMNS,
  SORT_ORDER,
} from '@/types';
import axios, { AxiosResponse } from 'axios';
import { City, Location, PropertiesModel, Property, RankedPropertyForRentView, RankedPropertyForSaleView } from '@/models/models';
import { splitAndTrimString } from '@/utils';
import { sequelize } from '@/config/sequelize';
import { RedisService } from './redis.service';

@Service()
export class PropertyService {
  private redis = Container.get(RedisService);
  private async findCityId(city: string): Promise<number | null> {
    if (!city) return null;

    const cityResponse = await City.findOne({
      where: { name: { [Op.iLike]: city } },
      attributes: ['id'],
    });
    return cityResponse?.id ?? null;
  }

  private selectPropertyAttributes(): string[] {
    return ['id', 'description', 'header', 'type', 'price', 'cover_photo_url', 'available', 'area', 'added', 'bedroom', 'bath'];
  }
  private selectAttributes(includeProperties: string[] = []): FindAttributeOptions {
    return [...this.selectPropertyAttributes(), [col('Location.name'), 'location'], [col('City.name'), 'city'], ...includeProperties];
  }

  private async mapPropertiesDetails(properties: PropertiesModel[]) {
    const promises = await Promise.allSettled(
      properties.map(async (property: any) => {
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

  public async findAllProperties({
    city,
    page_number,
    page_size = 10,
    sorting_order = [[SORT_COLUMNS.ID, SORT_ORDER.ASC]],
    purpose,
  }: IFindAllPropertiesProps): Promise<{
    rows: PropertiesModel[];
    count: number;
  }> {
    const cityId = await this.findCityId(city);
    return Property.findAndCountAll({
      where: {
        price: {
          [Op.gt]: 0,
        },
        purpose,
        ...(city && { city_id: cityId }),
      },
      order: sorting_order,
      offset: (page_number - 1) * page_size,
      limit: page_size,
      include: [
        {
          model: Location,
          attributes: [],
        },
        {
          model: City,
          attributes: [],
        },
      ],
      attributes: this.selectAttributes(),
      raw: true,
      nest: false,
    });
  }
  public async findPropertyById(propertyId: number) {
    const property = await Property.findByPk(propertyId, {
      include: [
        {
          model: Location,
          attributes: [],
        },
        {
          model: City,
          attributes: [],
        },
      ],
      attributes: {
        include: [
          [col('Location.name'), 'location'],
          [col('City.name'), 'city'],
          [col('Location.id'), 'location_id'],
        ],
      },
      raw: true,
      nest: false,
    });
    if (property) return this.mapPropertiesDetails([property]);
    else return [];
  }

  public async availableCitiesData() {
    return Object.values(AVAILABLE_CITIES);
  }

  private async getCountMap(whereClause: WhereOptions<InferAttributes<PropertiesModel>>) {
    const countMap = await Property.count({
      where: whereClause,
      attributes: ['type', [fn('COUNT', col('type')), 'count']],
      group: 'type',
    });
    return countMap.reduce((acc, item) => {
      acc[item.type as string] = item.count;
      return acc;
    }, {});
  }
  public async getPropertiesCountMap({
    city,
    location_ids,
    area_min,
    area_max,
    price_min,
    price_max,
    bedrooms,
    start_date,
    end_date,
    purpose,
  }: IGetPropertiesCountMapProps) {
    const whereClause = await this.getWhereClause({
      city,
      location_ids,
      area_min,
      area_max,
      price_min,
      price_max,
      bedrooms,
      start_date,
      end_date,
      purpose,
    });
    return this.getCountMap(whereClause);
  }
  public async getLocationId(location: string): Promise<number[]> {
    if (!location) return null;

    const locationConditions = location.split('|').map(l => ({
      name: {
        [Op.iLike]: `%${l.trim()}%`,
      },
    }));

    const locationResponse = await Location.findAll({
      where: {
        [Op.or]: locationConditions,
      },
      attributes: ['id'],
    });
    return locationResponse.map(({ id }) => id);
  }

  public async getWhereClause({
    city,
    location_ids = '',
    area_min,
    area_max,
    price_min,
    price_max,
    bedrooms = '',
    start_date,
    end_date,
    purpose,
    property_type = '',
  }: IGetWhereClauseProps): Promise<WhereOptions<InferAttributes<PropertiesModel>>> {
    const cityIdPromise = this.findCityId(city);
    const locationIds = splitAndTrimString(location_ids).map(Number);
    const bedroomsArray = splitAndTrimString(bedrooms).map(Number);
    const propertyTypesArray = splitAndTrimString(property_type);
    const [cityId] = await Promise.all([cityIdPromise]);
    return {
      purpose,
      price: { [Op.gt]: 0 },
      ...(property_type && { type: { [Op.in]: propertyTypesArray } }),
      ...(location_ids && { location_id: { [Op.in]: locationIds } }),
      ...(city && { city_id: cityId }),
      ...((area_min || area_max) && { area: { ...(area_min && { [Op.gte]: area_min }), ...(area_max && { [Op.lte]: area_max }) } }),
      ...((price_min || price_max) && { price: { ...(price_min && { [Op.gte]: price_min }), ...(price_max && { [Op.lte]: price_max }) } }),
      ...(bedrooms && { bedroom: { [Op.in]: bedroomsArray } }),
      ...((start_date || end_date) && { added: { ...(start_date && { [Op.gte]: start_date }), ...(end_date && { [Op.lte]: end_date }) } }),
    };
  }

  public async autoCompleteLocation(search: string, city: string) {
    const select = 'SELECT id, name FROM';
    const similarity = 'similarity(name, :search)';
    return sequelize.query(
      `${select} ${city ? `(${select} locations WHERE name ILIKE :city)` : 'locations'} ${
        search ? `WHERE ${similarity} > 0.1 ORDER BY ${similarity} DESC` : ''
      };`,
      { replacements: { ...(search ? { search } : {}), ...(city ? { city: `%${city.trim()}%` } : {}) }, type: QueryTypes.SELECT },
    );
  }

  public async searchProperties({
    city,
    location_ids,
    page_number,
    page_size = 10,
    sorting_order = [[SORT_COLUMNS.ID, SORT_ORDER.ASC]],
    property_type,
    area_min,
    area_max,
    price_min,
    price_max,
    bedrooms,
    start_date,
    end_date,
    purpose,
  }: ISearchPropertiesProps): Promise<{
    rows: PropertiesModel[];
    count: number;
  }> {
    const whereClause = await this.getWhereClause({
      property_type,
      area_min,
      area_max,
      price_min,
      price_max,
      bedrooms,
      start_date,
      end_date,
      purpose,
      city,
      location_ids,
    });

    return Property.findAndCountAll({
      where: whereClause,
      order: sorting_order,
      offset: (page_number - 1) * page_size,
      limit: page_size,
      include: [
        {
          model: Location,
          attributes: [],
        },
        {
          model: City,
          attributes: [],
        },
      ],
      attributes: this.selectAttributes(),
      raw: true,
      nest: false,
    });
  }
  public async getBestProperties({
    purpose,
    property_type,
    city,
    page_number,
    page_size,
    area_max,
    area_min,
    location_ids,
  }: IGetBestPropertiesProps) {
    const whereClause = await this.getWhereClause({ purpose, property_type, city, area_max, area_min, location_ids });
    return (purpose === 'for_sale' ? RankedPropertyForSaleView : RankedPropertyForRentView).findAndCountAll({
      where: whereClause,
      order: [
        ['location_id', 'ASC'],
        ['rank', 'ASC'],
      ],
      offset: (page_number - 1) * page_size,
      limit: page_size,
      include: [
        {
          model: Location,
          attributes: [],
        },
        {
          model: City,
          attributes: [],
        },
      ],
      attributes: this.selectAttributes(['rank']),
      raw: true,
    });
  }
}
