
/**
 * Functional programming utilities for TypeScript.
 * This module provides a Result type for handling success and error cases in a functional style.
 * It also includes utility functions for mapping, unwrapping, and matching results.
 */
export class Result<T, E = Error> {
    private constructor(private readonly _ok: boolean, private readonly _value?: T, private readonly _error?: E) {}

    /**
     * Creates a Result object representing a successful operation.
     * @param value The value to be returned in case of success.
     * @returns A Result object representing success.
     * @example
     * ```
     * const result = Result.ok("Success");
     * console.log(result.ok); // true
     * console.log(result.value); // "Success"
     * ```
     */
    static ok<T>(value: T): Result<T> {
        return new Result<T>(true, value);
    }

    static none_err_ok<T, E>(value: T): Result<T, E> {
        return new Result<T, E>(true, value);
    }

    /**
     * Creates a Result object representing an error.
     * @param error The error to be returned in case of failure.
     * @returns A Result object representing failure.
     * @example
     * ```
     * const result = Result.err(new Error("Something went wrong"));
     * console.log(result.ok); // false
     * console.log(result.error); // Error: Something went wrong
     * ```
     */
    static err<E>(error: E): Result<never, E> {
        return new Result<never, E>(false, undefined, error);
    }

    /**
     * Checks if the Result object represents a successful operation.
     * @returns True if the Result is successful, false otherwise.
     */
    get ok(): boolean {
        return this._ok;
    }

    /**
     * Retrieves the value of the Result object.
     * @throws Error if the Result is not successful.
     * @returns The value of the Result object.
     */
    get value(): T {
        if (!this._ok) {
            throw new Error("Cannot access value of an error result");
        }
        return this._value as T;
    }

    /**
     * Retrieves the error of the Result object.
     * @throws Error if the Result is successful.
     * @returns The error of the Result object.
     */
    get error(): E {
        if (this._ok) {
            throw new Error("Cannot access error of a success result");
        }
        return this._error as E;
    }

    /**
     * Maps the value of the Result object using a provided function.
     * @param fn The function to map the value.
     * @returns A new Result object with the mapped value or the original error.
     */
    map<U>(fn: (value: T) => U): Result<U, E> {
        return this._ok ? encase(fn)(this._value!) as Result<U, E> : Result.err(this._error as E);
    }

    /**
     * Unwraps the value of the Result object.
     * @returns The value of the Result object if successful, otherwise throws an error.
     */
    unwrap(): T {
        return this.expect("Cannot unwrap an error result");
    }

    /**
     * Unwraps the value of the Result object or throws an error with a custom message.
     * @param message The error message to throw if the Result is not successful.
     * @returns The value of the Result object if successful, otherwise throws an error with the provided message.
     */
    expect(message: string): T {
        if (!this._ok) {
            throw new Error(message);
        }
        return this._value as T;
    }

    /**
     * Unwraps the value of the Result object or returns a default value.
     * @param defaultValue The default value to return if the Result is not successful.
     * @returns The value of the Result object if successful, otherwise returns the default value.
     */
    unwrap_or<U>(defaultValue: U): T | U{
        return this._ok ? this._value as T : defaultValue;
    }
}

export interface Matchers<T, E extends Error, R1, R2> {
	ok(value: T): R1;
	err(error: E): R2;
}

/**
 * Matches the Result object with the provided matchers.
 * @remarks
 * This function takes a Result object and applies the appropriate matcher based on its success or failure.
 * If the Result is successful, the `ok` matcher is called with the value.
 * If the Result is an error, the `err` matcher is called with the error.
 * 
 * @param matchers The matchers to be used for the Result object.
 * @returns A function that takes a Result object and applies the appropriate matcher based on its success or failure.
 */
export const match =
	<T, E extends Error, R1, R2>(matchers: Matchers<T, E, R1, R2>) =>
	(result: Result<T, E>) =>
		result.ok === true ? matchers.ok(result.value) : matchers.err(result.error);

/**
 * Encapsulates a function call and returns a Result object.
 * @param fn The function to be executed.
 * @returns A Result object representing the success or failure of the function execution.
 */
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