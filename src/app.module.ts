import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import appConfig from './config/app.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppModules } from './modules';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV === 'development',
      }),
    }),
    ...AppModules,
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {

        console.log("SMTP Config:", {
          host: process.env.MAIL_HOST,
          port: process.env.MAIL_PORT,
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        });

        return {
          transport: {
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            auth: {
              user: process.env.MAIL_USER || 'cendozoden@gmail.com',
              pass: process.env.MAIL_PASSWORD || 'lmsgzhjiaeijfmhs',
            },
          },
          defaults: {
            from: '"No Reply" <noreply@example.com>',
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
