interface Publisher<T> {
  next(value: T): void;
}

type Subscriber<T> = (value: T) => void;

interface SubscribeOptions {
  sendCurrentValue: boolean | 'on_next_tick';
}

const DEFAULT_SUBSCRIBE_OPTIONS: SubscribeOptions = {
  sendCurrentValue: 'on_next_tick',
};

interface Subscribable<T> {
  subscribe(subscriber: Subscriber<T>, options?: SubscribeOptions): Disposable;
}

interface OptionallyReadable<T> {
  read(): T | undefined;
}

interface Readable<T> {
  read(): T;
}

export interface ReadonlyOptionalSubject<T>
  extends Subscribable<T>,
    OptionallyReadable<T> {}

export interface ReadonlySubject<T> extends Subscribable<T>, Readable<T> {}

export interface OptionalSubject<T>
  extends ReadonlyOptionalSubject<T>,
    Publisher<T> {}

export interface Subject<T> extends ReadonlySubject<T>, Publisher<T> {}

type DataType<T> = {
  [P in keyof T]: T[P] extends ReadonlySubject<infer D>
    ? D
    : T[P] extends ReadonlyOptionalSubject<infer D>
      ? D | undefined
      : never;
};

function map<T, U>(
  original: Subscribable<T> & Readable<T>,
  mapFn: (v: T) => U,
): ReadonlySubject<U>;
function map<T, U>(
  original: Subscribable<T> & OptionallyReadable<T>,
  mapFn: (v: T) => U,
): ReadonlyOptionalSubject<U>;
function map<T, U>(
  original: Subscribable<T> & OptionallyReadable<T>,
  mapFn: (v: T) => U,
): ReadonlyOptionalSubject<U> {
  const s: Subscribable<U> & OptionallyReadable<U> = {
    subscribe: (subscriber, options) => {
      return original.subscribe(v => {
        subscriber(mapFn(v));
      }, options);
    },

    read: () => {
      const originalValue = original.read();

      if (typeof originalValue !== 'undefined') {
        return mapFn(originalValue);
      }

      return originalValue;
    },
  };

  return s;
}

class DisposeBag implements Disposable {
  constructor(...initialContent: Disposable[]) {
    this.content.push(...initialContent);
  }

  private content: Disposable[] = [];

  public add(...disposables: Disposable[]) {
    this.content.push(...disposables);
  }
  public [Symbol.dispose](): void {
    this.content.forEach(i => {
      i[Symbol.dispose]();
    });
    this.content = [];
  }
}

function merge<
  const T extends readonly (
    | ReadonlySubject<unknown>
    | ReadonlyOptionalSubject<unknown>
  )[],
>(...sources: T): ReadonlySubject<DataType<T>> {
  const read: Readable<DataType<T>>['read'] = () => {
    return sources.map(s => s.read()) as DataType<T>;
  };

  const s: Subscribable<DataType<T>> & Readable<DataType<T>> = {
    read,
    subscribe: (subscriber, options) => {
      return new DisposeBag(
        ...sources.map(source =>
          source.subscribe(() => {
            subscriber(read());
          }, options),
        ),
      );
    },
  };

  return s;
}

interface Options {
  readonly onFirstSubscribe?: () => void;
  readonly onLastUnsubscribe?: () => void;
}

function publisher<T>(initialValue: T, options?: Options): Subject<T>;
function publisher<T>(initialValue?: T, options?: Options): OptionalSubject<T>;
function publisher<T>(initialValue?: T, options?: Options): OptionalSubject<T> {
  let lastId = 0;
  let current: T | undefined = initialValue;
  const subscribers = new Map<number, Subscriber<T>>();

  const s: Publisher<T> & Subscribable<T> & OptionallyReadable<T> = {
    next: value => {
      current = value;
      subscribers.forEach(subscriber => {
        subscriber(value);
      });
    },

    read: () => current,

    subscribe: (subscriber, subscribeOptions = DEFAULT_SUBSCRIBE_OPTIONS) => {
      lastId += 1;
      if (lastId === 1) {
        options?.onFirstSubscribe?.();
      }

      const thisId = lastId;
      subscribers.set(thisId, subscriber);

      if (subscribeOptions.sendCurrentValue === 'on_next_tick') {
        setImmediate(() => {
          if (typeof current !== 'undefined') {
            subscriber(current);
          }
        });
      } else if (subscribeOptions.sendCurrentValue) {
        subscriber(current as T);
      }

      return {
        [Symbol.dispose]: () => {
          subscribers.delete(thisId);
          lastId -= 1;

          if (lastId === 0) {
            options?.onLastUnsubscribe?.();
          }
        },
      };
    },
  };

  return s;
}

export default {
  publisher,
  map,
  merge,
};
