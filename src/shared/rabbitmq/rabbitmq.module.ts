// src/shared/rabbitmq/rabbitmq.module.ts
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
    imports: [
        RabbitMQModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                uri: `amqp://${configService.get('rabbitmq.user')}:${configService.get('rabbitmq.password')}@${configService.get('rabbitmq.host')}:${configService.get('rabbitmq.port')}`,
                exchanges: [
                    {
                        name: 'pdf_verification',
                        type: 'direct',
                    },
                ],
                connectionInitOptions: { wait: true },
                enableControllerDiscovery: true,
            }),
        }),
    ],
    exports: [RabbitMQModule],
})
export class RabbitmqModule { }
