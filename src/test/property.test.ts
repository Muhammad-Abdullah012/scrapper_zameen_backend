import request from 'supertest';
import { Container } from 'typedi';
import { mock, MockProxy } from 'jest-mock-extended';
import { App } from '@/app';
import { PropertyRoute } from '@routes/property.route';
import { PropertyService } from '@/services/property.service';
import { getPropertyTypes, getPropertyPurpose } from '@/utils/helpers';
import { AVAILABLE_CITIES } from '@/types';

jest.mock('@/services/property.service');
jest.mock('@/utils/helpers', () => ({
  getPropertyTypes: jest.fn(),
  getPropertyPurpose: jest.fn(),
}));
const propertyServiceMock: MockProxy<PropertyService> = mock<PropertyService>();

const getMockPropertiesData = () => ({
  count: 2,
  rows: [
    {
      id: 1,
      description: 'description',
      header: 'Header',
      type: 'house',
      price: 95000000,
      cover_photo_url: 'cover_photo_url.jpeg',
      available: true,
      area: 450,
      location: 'Islamabad',
    } as any,
    {
      id: 1,
      description: 'description',
      header: 'Header',
      type: 'house',
      price: 9000000,
      cover_photo_url: 'cover_photo_url.jpeg',
      available: true,
      area: 490,
      location: 'Islamabad',
    } as any,
  ],
});

const mockfindAllProperties = () => {
  propertyServiceMock.findAllProperties.mockResolvedValue(getMockPropertiesData());
};

const mockSearchProperties = () => {
  propertyServiceMock.searchProperties.mockResolvedValue(getMockPropertiesData());
};

describe('Property', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  let app;

  const forSaleQuery = { purpose: 'for_sale' };
  const requestUrl = (url: string = '') => request(app).get(`/property${url}`);
  const expectMessagePropertyInResponseBody = (response: request.Response) => {
    expect(response.body).toHaveProperty('message');
  };
  const expectBadRequestError = (response: request.Response) => {
    expect(response.status).toBe(400);
    expectMessagePropertyInResponseBody(response);
  };
  const expectInternalServerError = (response: request.Response) => {
    expect(response.status).toBe(500);
    expectMessagePropertyInResponseBody(response);
  };

  beforeAll(() => {
    Container.set(PropertyService, propertyServiceMock);
    const route = new PropertyRoute();
    route.property.property = propertyServiceMock;
    app = new App([route]).getServer();
    (getPropertyTypes as jest.Mock).mockResolvedValue(['house', 'apartment']);
    (getPropertyPurpose as jest.Mock).mockResolvedValue(['for_rent', 'for_sale']);
  });
  describe('GET /property', () => {
    it('should retrieve properties with default pagination and sorting', async () => {
      mockfindAllProperties();
      const response = await requestUrl().query(forSaleQuery);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message', 'findAll');
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
    });

    it('should retrieve properties with custom pagination', async () => {
      mockfindAllProperties();
      const response = await requestUrl().query({ page_size: 5, page_number: 2, ...forSaleQuery });
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
    });

    it('should retrieve properties sorted by price in descending order', async () => {
      mockfindAllProperties();
      const response = await requestUrl().query({ sort_by: 'price', sort_order: 'DESC', ...forSaleQuery });
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
      const prices = response.body.data.properties.map(property => Number(property.price));
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });
    it('should return 400 for invalid pagination parameters', async () => {
      const response = await requestUrl().query({ page_size: -1, page_number: 0 });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid sorting parameters', async () => {
      const response = await requestUrl().query({ sort_by: 'unknown_field', sort_order: 'DESC' });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid sorting parameters (sort_order)', async () => {
      const response = await requestUrl().query({ sort_by: 'price', sort_order: 'unknown' });
      expectBadRequestError(response);
    });
    it('Should return error', async () => {
      propertyServiceMock.findAllProperties.mockRejectedValue('Error');
      const response = await requestUrl().query(forSaleQuery);
      expectInternalServerError(response);
    });
  });
  describe('GET /property/count', () => {
    const BASE_URL = '/count';
    it('should retrieve the total count of properties', async () => {
      propertyServiceMock.getPropertiesCountMap.mockResolvedValue({
        'Agricultural Land': 76,
        Building: 2618,
        'Commercial Plot': 2768,
        Factory: 558,
      });
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('message');
    });
    it('should retrieve the total count of properties', async () => {
      propertyServiceMock.getPropertiesCountMap.mockResolvedValue({
        'Agricultural Land': 76,
        Building: 2618,
        'Commercial Plot': 2768,
        Factory: 558,
      });
      const response = await requestUrl(`${BASE_URL}/islamabad`).query(forSaleQuery);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('message');
    });
    it('Should return error', async () => {
      propertyServiceMock.getPropertiesCountMap.mockRejectedValue('Error');
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expectInternalServerError(response);
    });
  });
  describe('GET /property/:id', () => {
    it('should retrieve a property by ID', async () => {
      propertyServiceMock.findPropertyById.mockResolvedValue([{ id: 1 }]);
      const response = await requestUrl('/1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message', 'findOne');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('id', 1);
    });

    it('should return empty array for a non-existent property ID', async () => {
      propertyServiceMock.findPropertyById.mockResolvedValue([]);
      const response = await requestUrl('/9999');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message', 'findOne');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(0);
    });
    it('Should return error', async () => {
      propertyServiceMock.findPropertyById.mockRejectedValue('Error');
      const response = await requestUrl('/1');
      expectInternalServerError(response);
    });
  });
  describe('GET /property/:city', () => {
    const BASE_URL = '/islamabad';
    it('should retrieve properties in a specific city with default pagination and sorting', async () => {
      mockfindAllProperties();
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message', 'findAll');
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
      response.body.data.properties.forEach(property => {
        expect(property.location?.toLowerCase()?.includes('islamabad')).toBeTruthy();
      });
    });

    it('should retrieve properties in a specific city with custom pagination', async () => {
      mockfindAllProperties();
      const response = await requestUrl(BASE_URL).query({ page_size: 5, page_number: 2, ...forSaleQuery });
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
      response.body.data.properties.forEach(property => {
        expect(property.location?.toLowerCase()?.includes('islamabad')).toBeTruthy();
      });
    });

    it('should retrieve properties in a specific city sorted by price in descending order', async () => {
      mockfindAllProperties();
      const response = await requestUrl(BASE_URL).query({ sort_by: 'price', sort_order: 'DESC', ...forSaleQuery });
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
      const prices = response.body.data.properties.map(property => Number(property.price));
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });
    it('should return no data for invalid city name', async () => {
      const response = await requestUrl('/invalid city name');
      expectBadRequestError(response);
    });
    it('Should return error', async () => {
      propertyServiceMock.findAllProperties.mockRejectedValue('Error');
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expectInternalServerError(response);
    });
  });
  describe('GET /property/search', () => {
    const BASE_URL = '/search';
    it('should retrieve properties with default pagination and sorting', async () => {
      mockSearchProperties();
      const response = await requestUrl(BASE_URL);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message', 'search-properties');
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
    });

    it('should retrieve properties with custom pagination', async () => {
      mockSearchProperties();
      const response = await requestUrl(BASE_URL).query({ page_size: 5, page_number: 2, ...forSaleQuery });
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
    });

    it('should retrieve properties sorted by price in descending order', async () => {
      mockfindAllProperties();
      const response = await requestUrl(BASE_URL).query({ sort_by: 'price', sort_order: 'DESC', ...forSaleQuery });
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
      const prices = response.body.data.properties.map(property => Number(property.price));
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });
    it('should return 400 for invalid purpose parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ purpose: 'invalid' });
      expectBadRequestError(response);
    });
    it('should return error when get property purpose rejects', async () => {
      (getPropertyPurpose as jest.Mock).mockRejectedValueOnce('Error occured!');
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expectInternalServerError(response);
    });
    it('should return 400 for invalid pagination parameters', async () => {
      const response = await requestUrl(BASE_URL).query({ page_size: -1, page_number: 0 });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid sorting parameters', async () => {
      const response = await requestUrl(BASE_URL).query({ sort_by: 'unknown_field', sort_order: 'DESC' });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid sorting parameters (sort_order)', async () => {
      const response = await requestUrl(BASE_URL).query({ sort_by: 'price', sort_order: 'unknown' });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid location_ids parameters', async () => {
      const response = await requestUrl(BASE_URL).query({ location_ids: 'invalid' });
      expectBadRequestError(response);
    });
    it('should search', async () => {
      mockSearchProperties();
      const responses = await Promise.all([
        requestUrl(BASE_URL).query({ location_ids: '1,2,3', ...forSaleQuery }),
        requestUrl(BASE_URL).query({ location_ids: '123', ...forSaleQuery }),
        requestUrl(BASE_URL).query({ location_ids: '1', ...forSaleQuery }),
      ]);
      responses.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('message', 'search-properties');
        expect(res.body.data).toBeInstanceOf(Object);
      });
    });
    it('should return 400 for invalid price_min parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ price_min: -1 });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid price_max parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ price_max: -1 });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid area_min parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ area_min: -1 });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid area_max parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ area_max: -1 });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid bedrooms parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ bedrooms: '1,a' });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid property_type parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ property_type: 'invalid' });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid start_date parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ start_date: 'invalid' });
      expectBadRequestError(response);
    });
    it('should return 400 for invalid end_date parameter', async () => {
      const response = await requestUrl(BASE_URL).query({ end_date: 'invalid' });
      expectBadRequestError(response);
    });
    it('Should return error', async () => {
      propertyServiceMock.searchProperties.mockRejectedValue('Error');
      const response = await requestUrl(BASE_URL).query({ location_ids: '1,2,3', ...forSaleQuery });
      expectInternalServerError(response);
    });
  });
  describe('GET /property/available-cities', () => {
    const BASE_URL = '/available-cities';
    it('Should return available cities list', async () => {
      propertyServiceMock.availableCitiesData.mockResolvedValue(Object.values(AVAILABLE_CITIES));
      const response = await requestUrl(BASE_URL);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('message', 'available-cities');
    });
    it('Should return error', async () => {
      propertyServiceMock.availableCitiesData.mockRejectedValue('Error occured!');
      const response = await requestUrl(BASE_URL);
      expectInternalServerError(response);
    });
  });
  describe('GET /property/featured', () => {
    const BASE_URL = '/featured';
    it('Should return featured properties', async () => {
      mockSearchProperties();
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
    });
    it('Should return error', async () => {
      propertyServiceMock.searchProperties.mockRejectedValue('Error');
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expectInternalServerError(response);
    });
  });
  describe('GET /property/similar', () => {
    const BASE_URL = '/similar';
    it('Should return featured properties', async () => {
      propertyServiceMock.findPropertyById.mockResolvedValue([
        {
          id: 1,
          desc: 'description',
          header: 'Header',
          type: 'House',
          price: 95000000,
          cover_photo_url: 'cover_photo_url.jpeg',
          available: true,
          area: '20 Marla',
          location: 'Islamabad',
        },
      ]);
      mockSearchProperties();
      const response = await requestUrl(BASE_URL).query({ id: 1, ...forSaleQuery });
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data).toHaveProperty('properties');
      expect(response.body.data.properties).toBeInstanceOf(Array);
      expect(response.body.data).toHaveProperty('total_count');
    });
    it('Should return error', async () => {
      propertyServiceMock.searchProperties.mockRejectedValue(new Error('This should not be done!'));
      const response = await requestUrl(BASE_URL).query({ id: 1, ...forSaleQuery });
      expectInternalServerError(response);
    });
  });
  describe('GET /property/suggestions', () => {
    const BASE_URL = '/suggestions';
    it('Should return a list of suggestions', async () => {
      propertyServiceMock.autoCompleteLocation.mockResolvedValue([{ name: 'test1' } as any, { name: 'test2' } as any]);
      const response = await requestUrl(BASE_URL);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'auto-complete-locations');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual([{ name: 'test1' }, { name: 'test2' }]);
    });
    it('Should return error', async () => {
      propertyServiceMock.autoCompleteLocation.mockRejectedValue('Error occured!');
      const response = await requestUrl(BASE_URL);
      expectInternalServerError(response);
    });
  });
  describe('GET /property/best', () => {
    const BASE_URL = '/best';
    const data = {
      rows: [{ id: 1, desc: 'description', header: 'Header', type: 'House', price: 95000000 } as any],
      count: 1,
    };
    const responseBody = {
      properties: [{ id: 1, desc: 'description', header: 'Header', type: 'House', price: 95000000 }],
      total_count: 1,
      page_number: '1',
      page_size: '10',
    };
    it('Should return best properties', async () => {
      propertyServiceMock.getBestProperties.mockResolvedValue(data);
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'best-properties');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual(responseBody);
    });
    it('Should return error', async () => {
      propertyServiceMock.getBestProperties.mockRejectedValue('Error');
      const response = await requestUrl(BASE_URL).query(forSaleQuery);
      expectInternalServerError(response);
    });
    it('Should return best properties in a city', async () => {
      propertyServiceMock.getBestProperties.mockResolvedValue(data);
      const response = await requestUrl(`${BASE_URL}/islamabad`).query(forSaleQuery);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'best-properties');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual(responseBody);
    });
  });

  describe('GET /property/locations', () => {
    const BASE_URL = '/locations';
    it('Should return location hierarchy', async () => {
      const testValue = {
        id: 1,
        name: 'test1',
        children: [],
      };
      propertyServiceMock.getLocationHierarchy.mockResolvedValue([testValue]);
      const response = await requestUrl(BASE_URL);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'location-hierarchy');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual([testValue]);
    });
    it('Should return error', async () => {
      propertyServiceMock.getLocationHierarchy.mockRejectedValue('Error');
      const response = await requestUrl(BASE_URL);
      expectInternalServerError(response);
    });
  });
});
