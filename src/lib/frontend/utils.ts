/**
 * Creates a function that calls the provided function only once and returns the cached result on subsequent calls.
 * 
 * @typeParam T - The type of the function to be wrapped
 * @param {T} fn - The function to be called only once
 * @returns {T} A wrapped function that ensures the original function is only called on the first invocation
 * 
 * @example
 * ```
 * const expensiveCalculation = (x: number) => {
 *   console.log('Calculating...');
 *   return x * 2;
 * };
 * 
 * const onceCalculation = createOnceFunction(expensiveCalculation);
 * onceCalculation(5); // Logs "Calculating..." and returns 10
 * onceCalculation(5); // Returns 10 without logging or recalculating
 * ```
 */
export function createOnceFunction<T extends (...args: any[]) => any>(fn: T): T {
	let called = false;
	let result: ReturnType<T>;

	return function (...args: Parameters<T>) {
		if (!called) {
			called = true;
			result = fn(...args);
		}
		return result;
	} as T;
}
