import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null;
    const responseMessage =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
        ? exceptionResponse.message
        : exceptionResponse;

    const detail =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Error interno del servidor'
        : Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : typeof responseMessage === 'string'
            ? responseMessage
            : exception instanceof Error
              ? exception.message
              : 'Error en la solicitud';

    const problemJson = {
      type: `https://httpstatuses.com/${status}`,
      title: exception instanceof Error ? exception.name : 'HttpException',
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    response
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .json(problemJson);
  }
}
