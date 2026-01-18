import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const redisHost = this.configService.get<string>('redis.host');
        const redisPort = this.configService.get<number>('redis.port');
        const redisPassword = this.configService.get<string>('redis.password');

        this.client = new Redis({
            host: redisHost,
            port: redisPort,
            password: redisPassword || undefined,
        });

        this.client.on('error', (err) => {
            console.error('Redis error', err);
        });

    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
    }

    async set(key: string, value: string, ttlSeconds: number) {
        await this.client.set(key, value, 'EX', ttlSeconds);
    }

    async setPermanent(key: string, value: string) {
        await this.client.set(key, value);
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async del(key: string) {
        await this.client.del(key);
    }
}
