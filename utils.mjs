/**
 * @param {unknown} input
 * @param {string} key
 * @return {boolean | undefined}
 */
export function tryParseBoolean(input, key) {
	if (typeof input === 'object' && input !== null && key in input && typeof input[key] === 'boolean') {
		return input[key]
	}

	return undefined
}
