import { createEventStream } from '@/lib/realtime';

export async function GET() {
  return new Response(createEventStream(), {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream'
    }
  });
}
