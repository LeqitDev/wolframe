export class Result<T, E = Error> {
    private constructor(private readonly _ok: boolean, private readonly _value?: T, private readonly _error?: E) {}

    static ok<T>(value: T): Result<T> {
        return new Result<T>(true, value);
    }

    static err<E>(error: E): Result<never, E> {
        return new Result<never, E>(false, undefined, error);
    }

    get ok(): boolean {
        return this._ok;
    }

    get value(): T {
        if (!this._ok) {
            throw new Error("Cannot access value of an error result");
        }
        return this._value as T;
    }

    get error(): E {
        if (this._ok) {
            throw new Error("Cannot access error of a success result");
        }
        return this._error as E;
    }

    map<U>(fn: (value: T) => U): Result<U, E> {
        return this._ok ? encase(fn)(this._value!) as Result<U, E> : Result.err(this._error as E);
    }

    unwrap(): T {
        return this.expect("Cannot unwrap an error result");
    }

    expect(message: string): T {
        if (!this._ok) {
            throw new Error(message);
        }
        return this._value as T;
    }

    unwrap_or<U>(defaultValue: U): T | U{
        return this._ok ? this._value as T : defaultValue;
    }
}

export interface Matchers<T, E extends Error, R1, R2> {
	ok(value: T): R1;
	err(error: E): R2;
}

export const match =
	<T, E extends Error, R1, R2>(matchers: Matchers<T, E, R1, R2>) =>
	(result: Result<T, E>) =>
		result.ok === true ? matchers.ok(result.value) : matchers.err(result.error);

export const encase = <T, A extends unknown[]>(fn: (...args: A) => T) => (...args: A): Result<T> => {
    try {
        return Result.ok(fn(...args));
    } catch (error) {
        if (error instanceof Error) {
            return Result.err(error);
        }
        return Result.err(new Error("Unknown error"));
    }
}