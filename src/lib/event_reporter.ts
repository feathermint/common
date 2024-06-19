import * as Sentry from "@sentry/node";

export class EventReporter {
  static #instance: EventReporter;

  static init(options?: Sentry.NodeOptions): EventReporter {
    if (this.#instance) return this.#instance;

    Sentry.init(options);

    this.#instance = new EventReporter();
    return this.#instance;
  }

  get sentry() {
    return Sentry;
  }

  captureException = Sentry.captureException;
  captureMessage = Sentry.captureMessage;
}
