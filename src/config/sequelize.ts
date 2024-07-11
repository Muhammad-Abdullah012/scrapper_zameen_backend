import { Sequelize } from 'sequelize';
import { Pool } from 'pg';
import { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_HOST } from '.';

export const pgPool = new Pool({
  host: POSTGRES_HOST,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
  port: POSTGRES_PORT,
});
export const sequelize = new Sequelize({
  dialect: 'postgres',
  database: POSTGRES_DB,
  username: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  port: POSTGRES_PORT,
  host: POSTGRES_HOST,
});
