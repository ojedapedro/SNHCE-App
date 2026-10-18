import { of } from 'rxjs';
import { ApiResponse, ResponseTransformInterceptor } from './response-transform.interceptor';

interface TestPayload {
  nombre: string;
  valor: number;
}

/**
 * Tests unitarios – ResponseTransformInterceptor
 * Verifica que las respuestas se envuelven en { data, meta } correctamente.
 */
describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor<TestPayload>;

  beforeEach(() => {
    interceptor = new ResponseTransformInterceptor<TestPayload>();
  });

  function buildMocks(requestId = 'test-uuid-123') {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-request-id': requestId } }),
      }),
    } as any;

    const next = {
      handle: () => of({ nombre: 'Test', valor: 42 } as TestPayload),
    } as any;

    return { context, next };
  }

  it('envuelve la respuesta en { data, meta }', (done) => {
    const { context, next } = buildMocks();

    interceptor.intercept(context, next).subscribe((result: ApiResponse<TestPayload>) => {
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toEqual({ nombre: 'Test', valor: 42 });
      done();
    });
  });

  it('incluye requestId y timestamp en meta', (done) => {
    const { context, next } = buildMocks('req-abc-456');

    interceptor.intercept(context, next).subscribe((result: ApiResponse<TestPayload>) => {
      expect(result.meta.requestId).toBe('req-abc-456');
      expect(result.meta).toHaveProperty('timestamp');
      done();
    });
  });

  it('no modifica el contenido de data', (done) => {
    const { context, next } = buildMocks();

    interceptor.intercept(context, next).subscribe((result: ApiResponse<TestPayload>) => {
      expect(result.data.nombre).toBe('Test');
      expect(result.data.valor).toBe(42);
      done();
    });
  });
});
