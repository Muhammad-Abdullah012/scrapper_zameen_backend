import { Service } from 'typedi';
import { QueryTypes } from 'sequelize';
import { sequelize } from '@config/sequelize';
import { AVAILABLE_CITIES, SORT_COLUMNS, SORT_ORDER } from '@/types';

@Service()
export class PropertyService {
  public async findAllProperties({
    city,
    page_number,
    page_size = 10,
    sort_by = SORT_COLUMNS.ID,
    sort_order = SORT_ORDER.ASC,
  }: {
    city?: string;
    page_number: number;
    page_size?: number;
    sort_by?: SORT_COLUMNS;
    sort_order?: SORT_ORDER;
  }): Promise<any> {
    if (!Object.values(SORT_COLUMNS).includes(sort_by)) {
      throw new Error('Invalid sort_by column');
    }
    if (!Object.values(SORT_ORDER).includes(sort_order)) {
      throw new Error('Invalid sort_order');
    }
    const countQuery = city ? `SELECT COUNT(*) FROM property_v2 WHERE location ILIKE :city;` : `SELECT COUNT(*) FROM property_v2;`;
    const countReplacements = city ? { city: `%${city}%` } : {};
    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements: countReplacements,
    });
    const totalCount = countResult[0]['count'];
    const sortColumn = sort_by === SORT_COLUMNS.PRICE ? `CAST(NULLIF(price, '') AS double precision)` : sort_by;

    const offset = (page_number - 1) * page_size;
    const query = city
      ? `SELECT * FROM property_v2 WHERE location ILIKE :city ORDER BY ${sortColumn}  ${sort_order} LIMIT :page_size OFFSET :offset;`
      : `SELECT * FROM property_v2 ORDER BY ${sortColumn} ${sort_order} LIMIT :page_size OFFSET :offset`;
    const replacements = city ? { city: `%${city}%`, page_size, offset } : { page_size, offset };

    const properties = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements,
    });
    return { properties, totalCount };
  }
  public async findPropertyById(propertyId: number) {
    return await sequelize.query(`SELECT * FROM property_v2 WHERE id = :propertyId`, {
      type: QueryTypes.SELECT,
      replacements: { propertyId },
    });
  }
  public async getPropertyCount({ city }: { city?: string }) {
    const query = city ? `SELECT COUNT(*) FROM property_v2 WHERE location ILIKE :city;` : `SELECT COUNT(*) FROM property_v2;`;
    const replacements = city ? { city: `%${city}%` } : {};
    return await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements,
    });
  }
  public async availableCitiesData() {
    return Object.values(AVAILABLE_CITIES);
  }
  public async searchProperties({
    city,
    search,
    page_number,
    page_size = 10,
    sort_by = SORT_COLUMNS.ID,
    sort_order = SORT_ORDER.ASC,
  }: {
    city?: string;
    search: string;
    page_number: number;
    page_size?: number;
    sort_by?: SORT_COLUMNS;
    sort_order?: SORT_ORDER;
  }): Promise<any> {
    if (!Object.values(SORT_COLUMNS).includes(sort_by)) {
      throw new Error('Invalid sort_by column');
    }
    if (!Object.values(SORT_ORDER).includes(sort_order)) {
      throw new Error('Invalid sort_order');
    }
    const sortColumn = sort_by === SORT_COLUMNS.PRICE ? `CAST(NULLIF(price, '') AS double precision)` : sort_by;

    const offset = (page_number - 1) * page_size;
    let baseQuery = `FROM property_v2 WHERE 1=1 `;
    const replacements: any = { page_size, offset };

    if (city) {
      baseQuery += `AND location ILIKE :city `;
      replacements.city = `%${city}%`;
    }

    if (search) {
      baseQuery += `AND ("desc" ILIKE :search OR header ILIKE :search OR location ILIKE :search OR price ILIKE :search OR bath ILIKE :search OR area ILIKE :search OR bedroom ILIKE :search OR type ILIKE :search OR purpose ILIKE :search OR initial_amount ILIKE :search OR monthly_installment ILIKE :search OR remaining_installments ILIKE :search) `;
      replacements.search = `%${search}%`;
    }
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT,
      replacements,
    });
    const totalCount = countResult[0]['total'];

    const query = `SELECT * ${baseQuery} ORDER BY ${sortColumn} ${sort_order} LIMIT :page_size OFFSET :offset`;

    const properties = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements,
    });
    return { properties, totalCount };
  }
}
