type EventPayload = {
  type: string;
  data: unknown;
};

const subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

function writeEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: EventPayload
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

export function createEventStream() {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      subscribers.add(controller);
      writeEvent(controller, {
        type: 'connected',
        data: { ok: true, ts: new Date().toISOString() }
      });
    },
    cancel() {
      if (controllerRef) {
        subscribers.delete(controllerRef);
      }
    }
  });
}

export function publishEvent(payload: EventPayload) {
  for (const controller of subscribers) {
    try {
      writeEvent(controller, payload);
    } catch {
      subscribers.delete(controller);
    }
  }
}
