import 'dotenv/config';

import { DataSource } from 'typeorm';
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5434', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [
    __dirname + '/../modules/**/*.entity.{ts,js}',
    __dirname + '/../submissions/**/*.entity.{ts,js}',
  ],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: process.env.NODE_ENV === 'development',
});