import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

/**
 * Tests unitarios – HttpExceptionFilter
 *
 * El filtro requiere:
 *  - winstonLogger  (inyectado como WINSTON_MODULE_NEST_PROVIDER)
 *  - configService  (para leer NODE_ENV)
 *
 * Ambos se mockean con jest.fn() para evitar dependencias de infraestructura.
 */
describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  const winstonLoggerMock = {
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  } as any;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    }),
  } as any;

  beforeEach(() => {
    filter = new HttpExceptionFilter(winstonLoggerMock, configServiceMock);
    jest.clearAllMocks();
  });

  /** Helper: construye un ArgumentsHost mock mínimo */
  function buildHost(method = 'GET', url = '/api/v1/test') {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const responseMock = { status: statusMock };
    const requestMock = {
      method,
      url,
      headers: {},
      ip: '127.0.0.1',
      user: undefined,
      get: jest.fn().mockReturnValue('test-agent'),
    };
    return {
      host: {
        switchToHttp: () => ({
          getResponse: () => responseMock,
          getRequest: () => requestMock,
        }),
      } as any,
      json: jsonMock,
      status: statusMock,
    };
  }

  it('responde con el código HTTP correcto en una HttpException 404', () => {
    const { host, status, json } = buildHost();
    filter.catch(new HttpException('No encontrado', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('No encontrado');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('path', '/api/v1/test');
  });

  it('responde con 500 para errores genéricos no controlados', () => {
    const { host, status, json } = buildHost();
    filter.catch(new Error('fallo inesperado'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body).not.toHaveProperty('stack');
  });

  it('en producción: oculta el mensaje interno de errores 5xx', () => {
    configServiceMock.get.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'production' : undefined,
    );
    // Re-crear el filtro con NODE_ENV=production
    const prodFilter = new HttpExceptionFilter(winstonLoggerMock, configServiceMock);
    const { host, json } = buildHost();
    prodFilter.catch(new Error('mensaje secreto interno'), host);

    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Error interno del servidor');
    expect(body.message).not.toBe('mensaje secreto interno');
  });

  it('maneja errores Prisma P2002 (unique constraint) como 409 Conflict', () => {
    const { host, status, json } = buildHost('POST', '/api/v1/pacientes');
    const prismaError = Object.assign(new Error('Unique constraint'), {
      constructor: { name: 'PrismaClientKnownRequestError' },
      code: 'P2002',
    });
    // Sobreescribir el constructor name para que el duck-typing funcione
    Object.defineProperty(prismaError, 'constructor', {
      value: { name: 'PrismaClientKnownRequestError' },
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(409);
  });

  it('maneja errores Prisma P2025 (not found) como 404', () => {
    const { host, status } = buildHost();
    const prismaError = new Error('Record not found');
    Object.defineProperty(prismaError, 'constructor', {
      value: { name: 'PrismaClientKnownRequestError' },
    });
    (prismaError as any).code = 'P2025';

    filter.catch(prismaError, host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });
});
