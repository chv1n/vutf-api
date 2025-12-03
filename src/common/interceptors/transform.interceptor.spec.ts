import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
    let interceptor: TransformInterceptor<any>;

    beforeEach(() => {
        interceptor = new TransformInterceptor();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should transform standard response', (done) => {
        const context = {} as ExecutionContext;
        const next = {
            handle: () => of('test data'),
        } as CallHandler;

        interceptor.intercept(context, next).subscribe((result) => {
            expect(result).toEqual({
                success: true,
                data: 'test data',
            });
            done();
        });
    });

    it('should transform paginated response', (done) => {
        const context = {} as ExecutionContext;
        const paginatedData = {
            data: ['item1', 'item2'],
            meta: { page: 1 },
        };
        const next = {
            handle: () => of(paginatedData),
        } as CallHandler;

        interceptor.intercept(context, next).subscribe((result) => {
            expect(result).toEqual({
                success: true,
                data: ['item1', 'item2'],
                meta: { page: 1 },
            });
            done();
        });
    });
});
