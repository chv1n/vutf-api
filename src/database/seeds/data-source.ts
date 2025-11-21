import 'dotenv/config';

import { DataSource } from 'typeorm';
import { UserAccount } from '../../modules/users/entities/user-account.entity';
import { Student } from '../../modules/users/entities/student.entity';
import { Instructor } from '../../modules/users/entities/instructor.entity';
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [UserAccount, Student, Instructor],
  synchronize: true,
});