import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('RedisService', () => {
    let service: RedisService;
    let redisClientMock: any;

    beforeEach(async () => {
        redisClientMock = {
            on: jest.fn(),
            quit: jest.fn(),
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
        };

        (Redis as unknown as jest.Mock).mockReturnValue(redisClientMock);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key) => {
                            if (key === 'redis.host') return 'localhost';
                            if (key === 'redis.port') return 6379;
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<RedisService>(RedisService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should initialize redis client', async () => {
            await service.onModuleInit();
            expect(Redis).toHaveBeenCalledWith({
                host: 'localhost',
                port: 6379,
                password: undefined,
            });
            expect(redisClientMock.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
    });

    describe('onModuleDestroy', () => {
        it('should quit redis client', async () => {
            await service.onModuleInit(); // Initialize first
            await service.onModuleDestroy();
            expect(redisClientMock.quit).toHaveBeenCalled();
        });
    });

    describe('set', () => {
        it('should set key with ttl', async () => {
            await service.onModuleInit();
            await service.set('key', 'value', 60);
            expect(redisClientMock.set).toHaveBeenCalledWith('key', 'value', 'EX', 60);
        });
    });

    describe('get', () => {
        it('should get value by key', async () => {
            await service.onModuleInit();
            redisClientMock.get.mockResolvedValue('value');
            const result = await service.get('key');
            expect(result).toBe('value');
            expect(redisClientMock.get).toHaveBeenCalledWith('key');
        });
    });

    describe('del', () => {
        it('should delete key', async () => {
            await service.onModuleInit();
            await service.del('key');
            expect(redisClientMock.del).toHaveBeenCalledWith('key');
        });
    });
});
