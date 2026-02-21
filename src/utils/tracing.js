import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace } from '@opentelemetry/api';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'book-tracker-ui',
});

// Configure exporter to use the local Vite proxy to avoid CORS
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:5173/v1/traces',
});

// Pass the span processor directly in the configuration object to avoid calling addSpanProcessor
export const provider = new WebTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(exporter, {
    scheduledDelayMillis: 500, // Flush quickly for local dev
  })],
});

provider.register();

export const tracer = trace.getTracer('gemini-api-tracer');
