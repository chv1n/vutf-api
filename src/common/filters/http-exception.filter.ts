import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    response
      .status(status)
      .json({
        success: false,
        error: {
          code: `HTTP_${status}`,
          message: exceptionResponse.message || exception.message,
          details: exceptionResponse.message // กรณีเป็น Array (Validation Error)
        },
      });
  }
}