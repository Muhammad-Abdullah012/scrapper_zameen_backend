import { Sequelize } from 'sequelize';
import { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_HOST } from '.';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  database: POSTGRES_DB,
  username: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  port: POSTGRES_PORT,
  host: POSTGRES_HOST,
  pool: {
    min: 0,
    max: 5,
    idle: 1000,
    acquire: 100000,
  },
});
