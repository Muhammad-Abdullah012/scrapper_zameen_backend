import { Service } from 'typedi';
import { FindAttributeOptions, Includeable, InferAttributes, Op, QueryTypes, WhereOptions, col, fn } from 'sequelize';
import { POPULARITY_TREND_URL, AREA_TREND_URL, CONTACT_URL, FEATURED_PROPERTY_PRICE_THRESHOLD } from '@config/index';
import {
  AVAILABLE_CITIES,
  IFeaturedPropertiesProps,
  IFindAllPropertiesProps,
  IGetBestPropertiesProps,
  IgetMaxPriceChangePercentageLastYear,
  IgetPriceChangePercentageData,
  IGetPropertiesCountMapProps,
  IGetWhereClauseProps,
  ILocationHierarchy,
  ISearchPropertiesProps,
  SORT_COLUMNS,
  SORT_ORDER,
} from '@/types';
import axios, { AxiosResponse } from 'axios';
import {
  City,
  Location,
  PropertiesModel,
  Property,
  AgencyModel,
  RankedPropertyForRentView,
  RankedPropertyForSaleView,
  CountPropertiesView,
  TimeSeriesData,
} from '@/models/models';
import { splitAndTrimString } from '@/utils';
import { sequelize } from '@/config/sequelize';

@Service()
export class PropertyService {
  private async findCityId(city: string): Promise<number | null> {
    if (!city) return null;

    const cityResponse = await City.findOne({
      where: { name: { [Op.iLike]: city } },
      attributes: ['id'],
    });
    return cityResponse?.id ?? null;
  }

  private selectPropertyAttributes(): string[] {
    return ['id', 'description', 'header', 'type', 'price', 'cover_photo_url', 'available', 'area', 'added', 'created_at', 'bedroom', 'bath'];
  }
  private selectAttributes(includeProperties: string[] = []): FindAttributeOptions {
    return [
      ...this.selectPropertyAttributes(),
      [col('Location.name'), 'location'],
      [col('City.name'), 'city'],
      [col('Agency.title'), 'agency'],
      ...includeProperties,
    ];
  }

  private includeModelsInQuery = (): Includeable | Includeable[] => {
    return [
      {
        model: Location,
        attributes: [],
      },
      {
        model: City,
        attributes: [],
      },
      {
        model: AgencyModel,
        attributes: [],
      },
    ];
  };

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
      include: this.includeModelsInQuery(),
      attributes: this.selectAttributes(),
      raw: true,
      nest: false,
    });
  }
  public async findPropertyById(propertyId: number) {
    const property = await Property.findByPk(propertyId, {
      include: this.includeModelsInQuery(),
      attributes: {
        include: [
          [col('Location.name'), 'location'],
          [col('City.name'), 'city'],
          [col('Location.id'), 'location_id'],
          [col('Agency.title'), 'agency'],
          [col('Agency.profile_url'), 'agency_profile_url'],
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
    // city,
    // location_ids,
    // area_min,
    // area_max,
    // price_min,
    // price_max,
    // bedrooms,
    // start_date,
    // end_date,
    purpose,
  }: IGetPropertiesCountMapProps) {
    return CountPropertiesView.findAll({ attributes: ['type', 'count'], where: { purpose } });
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
    is_posted_by_agency,
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
      ...(is_posted_by_agency && {
        agency_id: {
          [is_posted_by_agency === 'true' ? Op.ne : Op.eq]: null,
        },
      }),
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
    is_posted_by_agency,
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
      is_posted_by_agency,
    });

    return Property.findAndCountAll({
      where: whereClause,
      order: sorting_order,
      offset: (page_number - 1) * page_size,
      limit: page_size,
      include: this.includeModelsInQuery(),
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
      include: this.includeModelsInQuery(),
      attributes: this.selectAttributes(['rank']),
      raw: true,
    });
  }

  public getFeaturedProperties({
    purpose,
    page_size = 10,
    page_number,
    sorting_order = [[SORT_COLUMNS.ID, SORT_ORDER.ASC]],
  }: IFeaturedPropertiesProps) {
    // Featured properties are those Top properties with price >= FEATURED_PROPERTY_PRICE_THRESHOLD
    return (purpose == 'for_sale' ? RankedPropertyForSaleView : RankedPropertyForRentView).findAndCountAll({
      where: {
        price: { [Op.gte]: FEATURED_PROPERTY_PRICE_THRESHOLD },
      },
      offset: (page_number - 1) * page_size,
      limit: page_size,
      order: sorting_order,
    });
  }

  public async getLocationHierarchy() {
    const locationMap = new Map<string, ILocationHierarchy>();
    const allLocations = await Location.findAll({ attributes: ['id', 'name'] });

    allLocations.forEach(location => {
      const locationNameParts = splitAndTrimString(location.name).reverse();
      this.buildLocationHierarchy(locationMap, locationNameParts, location.id);
    });

    return this.convertMapToHierarchy(locationMap);
  }

  private buildLocationHierarchy(locationMap: Map<string, ILocationHierarchy>, locationNameParts: string[], locationId: number) {
    if (locationNameParts.length === 0) return;

    const currentLocationName = locationNameParts[0];

    if (!locationMap.has(currentLocationName)) {
      locationMap.set(currentLocationName, { name: currentLocationName, id: locationId, children: [] });
    }

    const currentLocation = locationMap.get(currentLocationName)!;

    if (locationNameParts.length > 1) {
      const childName = locationNameParts[1];
      let child = currentLocation.children.find(child => child.name === childName);

      if (!child) {
        child = { name: childName, id: locationId, children: [] };
        currentLocation.children.push(child);
      }

      this.buildLocationHierarchy(new Map(currentLocation.children.map(child => [child.name, child])), locationNameParts.slice(1), locationId);
    }
  }

  private convertMapToHierarchy(locationMap: Map<string, ILocationHierarchy>): ILocationHierarchy[] {
    return Array.from(locationMap.values()).map(node => ({
      id: node.id,
      name: node.name,
      children: this.convertMapToHierarchy(new Map(node.children.map(child => [child.name, child]))),
    }));
  }

  public async getMaxPriceChangePercentageLastYear({
    city,
    area,
    limit,
    purpose,
    year_count,
    property_type,
    location_ids = '',
    sort_order = SORT_ORDER.DESC,
  }: IgetMaxPriceChangePercentageLastYear) {
    const column = `percentage_change_${year_count}_year${year_count > 1 ? 's' : ''}`;
    const propertyTypesArray = splitAndTrimString(property_type);
    const locationIds = splitAndTrimString(location_ids).map(Number);

    return TimeSeriesData.findAll({
      where: {
        purpose,
        [column]: {
          [Op.ne]: null,
        },
        city: {
          [Op.iLike]: city,
        },
        ...(area && { area }),
        ...(location_ids && { location_id: { [Op.in]: locationIds } }),
        ...(property_type && { type: { [Op.in]: propertyTypesArray } }),
      },
      limit,
      raw: true,
      order: [[column, sort_order]],
    });
  }

  public async getPriceChangePercentageData({
    city,
    area,
    limit,
    purpose,
    page_size,
    year_count,
    page_number,
    property_type,
    location_ids = '',
    sort_order = SORT_ORDER.DESC,
  }: IgetPriceChangePercentageData) {
    const column = `percentage_change_${year_count}_year${year_count > 1 ? 's' : ''}`;
    const propertyTypesArray = splitAndTrimString(property_type);
    const locationIds = splitAndTrimString(location_ids).map(Number);

    return TimeSeriesData.findAll({
      where: {
        purpose,
        [column]: {
          [Op.ne]: null,
        },
        city: {
          [Op.iLike]: city,
        },
        ...(area && { area }),
        ...(location_ids && { location_id: { [Op.in]: locationIds } }),
        ...(property_type && { type: { [Op.in]: propertyTypesArray } }),
      },
      attributes: {
        exclude: ['price_change'],
      },
      limit,
      raw: true,
      order: [[column, sort_order]],
      offset: (page_number - 1) * page_size,
    });
  }
}
