import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;

    beforeEach(() => {
        filter = new HttpExceptionFilter();
    });

    it('should be defined', () => {
        expect(filter).toBeDefined();
    });

    it('should catch http exception and format response', () => {
        const mockJson = jest.fn();
        const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
        const mockHttpArgumentsHost = jest.fn().mockReturnValue({
            getResponse: mockGetResponse,
            getRequest: jest.fn(),
        });

        const mockArgumentsHost = {
            switchToHttp: mockHttpArgumentsHost,
            getArgByIndex: jest.fn(),
            getArgs: jest.fn(),
            getType: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
        } as unknown as ArgumentsHost;

        const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

        filter.catch(exception, mockArgumentsHost);

        expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
        expect(mockJson).toHaveBeenCalledWith({
            success: false,
            error: {
                code: `HTTP_${HttpStatus.FORBIDDEN}`,
                message: 'Forbidden',
                details: undefined,
            },
        });
    });
});
