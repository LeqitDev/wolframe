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
