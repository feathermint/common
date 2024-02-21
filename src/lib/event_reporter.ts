import * as Sentry from "@sentry/node";

export class EventReporter {
  static #instance: EventReporter;

  static init(dsn?: string): EventReporter {
    if (this.#instance) return this.#instance;

    Sentry.init({ dsn });

    this.#instance = new EventReporter();
    return this.#instance;
  }

  captureException = Sentry.captureException;
  captureMessage = Sentry.captureMessage;
  requestHandler = Sentry.Handlers.requestHandler;
  errorHandler = Sentry.Handlers.errorHandler;
}
