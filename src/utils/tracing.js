import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace } from '@opentelemetry/api';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'book-tracker-ui',
});

// Only export spans during local development. In a production / Capacitor
// build the localhost collector doesn't exist, so attaching the exporter
// would make the BatchSpanProcessor retry failing batches forever.
const spanProcessors = import.meta.env.DEV
  ? [new BatchSpanProcessor(
      new OTLPTraceExporter({ url: 'http://localhost:5173/v1/traces' }), // local Vite proxy avoids CORS
      { scheduledDelayMillis: 500 }, // flush quickly for local dev
    )]
  : [];

export const provider = new WebTracerProvider({
  resource,
  spanProcessors,
});

provider.register();

export const tracer = trace.getTracer('gemini-api-tracer');
