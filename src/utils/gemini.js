const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const generateSummary = async (metadata, apiKey) => {
  if (!apiKey) {
    throw new Error('API Key is missing');
  }

  const { title, author, chapterName, progress, previousChapters, anchors } = metadata;

  const chapterList = previousChapters && previousChapters.length > 0
    ? previousChapters.join(', ')
    : 'Unknown chapter history';

  const anchorContext = anchors?.start && anchors?.end 
    ? `\n  - **The current chapter begins with:** "${anchors.start}..."\n  - **The current chapter ends near:** "${anchors.end}..."` 
    : '';

  const prompt = `You are an expert literary assistant. The user is reading the book "${title}" by ${author}.
  PLEASE USE GOOGLE SEARCH to find detailed, accurate plot summaries of this specific book to ensure your answer is perfectly accurate.
  
  **User's Current Position:**
  - **Progress:** ${(parseFloat(progress) * 100).toFixed(1)}% through the book
  - **Chapters they have already finished:** ${chapterList}
  - **They just finished reading the chapter:** ${chapterName || 'Unknown'}${anchorContext}
  
  **Task:**
  Provide a **detailed but concise** summary of the specific plot events that occurred *leading up to exactly this point* in the book.
  Be extremely careful NOT to spoil events that happen after the chapter they just finished.
  
  **Structure your response as follows:**
  1.  **The Story So Far:** A bulleted list of the key plot points leading up to this exact moment. Focus heavily on what happened in the chapters immediately preceding this one.
  2.  **Key Characters:** A bulleted list of 2-4 main characters and exactly what situation they are currently in.
  3.  **Current Situation:** A single sentence setting the stage for what the reader is about to read next.
  
  Keep the total output under 400 words. Use Markdown (bold, bullet points).`;

  // Start OpenTelemetry span
  // Start OpenTelemetry span
  const { tracer, provider } = await import('./tracing.js');
  const { context, trace, SpanStatusCode } = await import('@opentelemetry/api');
  
  return await tracer.startActiveSpan('gemini.generateContent', async (span) => {
    // OpenInference span kind — tells Phoenix this is an LLM span
    span.setAttribute('openinference.span.kind', 'LLM');
    span.setAttribute('llm.model_name', 'gemini-2.5-flash');
    span.setAttribute('llm.provider', 'Google');
    span.setAttribute('input.value', prompt);
    span.setAttribute('input.mime_type', 'text/plain');

    try {
      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          tools: [
            {
              googleSearch: {}
            }
          ]
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Too many requests. Google Free Tier limits to 15 requests per minute. Please wait a moment and try again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate summary');
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      
      span.setAttribute('output.value', responseText);
      span.setAttribute('llm.completions', responseText);
      span.setStatus({ code: SpanStatusCode.OK });

      // Record token usage from Gemini's usageMetadata
      const usage = data.usageMetadata;
      if (usage) {
        span.setAttribute('llm.token_count.prompt', usage.promptTokenCount ?? 0);
        span.setAttribute('llm.token_count.completion', usage.candidatesTokenCount ?? 0);
        span.setAttribute('llm.token_count.total', usage.totalTokenCount ?? 0);
      }
      
      return responseText;
    } catch (error) {
      console.error('Gemini API Error:', error);
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
      // Ensure the span is flushed to Phoenix
      if (provider && typeof provider.forceFlush === 'function') {
        setTimeout(() => provider.forceFlush().catch(console.error), 0);
      }
    }
  });
};
