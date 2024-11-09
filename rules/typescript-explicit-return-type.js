// @ts-check

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'enforce functions to have explicit function return types',
		},
		schema: [
			{
				type: 'object',
				properties: {
					allowJSX: {
						type: 'boolean',
						description: 'Whether to ignore functions that return JSX.',
					},
					allowNonExports: {
						type: 'boolean',
						description: 'Whether to ignore non-exported functions.',
					},
					allowSingleValueReturns: {
						type: 'boolean',
						description: 'Whether to ignore functions that have zero or one non-void return statement.',
					}
				},
			}
		],
		messages: {
			error: 'Expected this function to have an explicit return type.',
		}
	},
	create: function (context) {
		const { allowJSX, allowNonExports, allowSingleValueReturns } = Object.assign(
			{ allowJSX: false, allowNonExports: false, allowSingleValueReturns: false },
			context.options[0]
		)

		return {
			FunctionDeclaration: function (root) {
				if ('returnType' in root && root.returnType) {
					return
				}

				if (allowJSX && hasJSXReturned(root)) {
					return
				}

				if (allowSingleValueReturns && !hasMultipleNonVoidReturns(root)) {
					return
				}

				if (allowNonExports && !(
					root.parent.type === 'ExportDefaultDeclaration' ||
					root.parent.type === 'ExportNamedDeclaration' ||
					context.sourceCode.getDeclaredVariables(root)[0]?.references.some(({ identifier }) =>
						'parent' in identifier &&
						typeof identifier.parent === 'object' &&
						identifier.parent &&
						'type' in identifier.parent &&
						(identifier.parent?.type === 'ExportDefaultDeclaration' || identifier.parent?.type === 'ExportSpecifier')
					)
				)) {
					return
				}

				if (!root.loc) {
					return
				}

				context.report({
					loc: context.sourceCode.getTokenBefore(root.body, { includeComments: false })?.loc ?? root.loc,
					messageId: 'error',
				})
			},
			VariableDeclarator: function (root) {
				if (!root.init) {
					return
				}

				if (!(root.init.type === 'FunctionExpression' || root.init.type === 'ArrowFunctionExpression')) {
					return
				}

				if ('returnType' in root.init && root.init.returnType) {
					return
				}

				if (
					root.id &&
					root.id.type === 'Identifier' &&
					('typeAnnotation' in root.id && root.id.typeAnnotation)
				) {
					return
				}

				if (allowJSX && hasJSXReturned(root.init)) {
					return
				}

				if (allowSingleValueReturns && !hasMultipleNonVoidReturns(root.init)) {
					return
				}

				if (allowNonExports && !(
					root.parent.parent.type === 'ExportDefaultDeclaration' ||
					root.parent.parent.type === 'ExportNamedDeclaration' ||
					context.sourceCode.getDeclaredVariables(root)[0]?.references.some(({ identifier }) =>
						'parent' in identifier &&
						typeof identifier.parent === 'object' &&
						identifier.parent &&
						'type' in identifier.parent &&
						(identifier.parent?.type === 'ExportDefaultDeclaration' || identifier.parent?.type === 'ExportSpecifier')
					)
				)) {
					return
				}

				if (!root.id.loc) {
					return
				}

				context.report({
					loc: context.sourceCode.getTokenBefore(root.init.body, { filter: token => token.type === 'Punctuator' && token.value === ')' })?.loc ?? root.id.loc,
					messageId: 'error',
				})
			},
		}
	},
	tests: process.env.TEST && {
		valid: [
			{
				code: `
					const a = 1
					export const b = 2
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					function a() { return <div /> }
					const b = function () { return <div /> }
					const c = () => { return <div /> }
					const d = () => <div />
					const e = () => {
						if (true) return <div />
						else return ''
					}
				`,
				options: [{ allowJSX: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
					parserOptions: {
						ecmaFeatures: { jsx: true },
					}
				},
			},
			{
				code: `
					function a(): string {}
					const b = function (): string {}
					const c = (): string => {}
					const d: () => string = () => {}
					const e = (): string => ''
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					function a() {}
					const b = function () {}
					const c = () => {}
					const d = () => ''
				`,
				options: [{ allowNonExports: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					function a() { return '' }
					const b = function () { return '' }
					const c = () => { return '' }
					const d = () => ''
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export function x() {
						if (a) return
						if (b) return undefined
						if (c) return void(0)
						return 1
					}
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
		],
		invalid: [
			{
				code: `
					function a() { return <div /> }
					const b = function () { return <div /> }
					const c = () => { return <div /> }
					const d = () => <div />
					const e = () => {
						if (true) return <div />
						else return ''
					}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
					parserOptions: {
						ecmaFeatures: { jsx: true },
					}
				},
				errors: [
					{ messageId: 'error', line: 2, column: 17, endColumn: 18 },
					{ messageId: 'error', line: 3 },
					{ messageId: 'error', line: 4 },
					{ messageId: 'error', line: 5 },
					{ messageId: 'error', line: 6 },
				],
			},
			{
				code: `
					export function a() {}
					export const b = function () {}
					export const c = () => {}
					export const d = () => ''
					const e = () => {}
					export { e }
				`,
				options: [{ allowNonExports: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [
					{ messageId: 'error', line: 2 },
					{ messageId: 'error', line: 3 },
					{ messageId: 'error', line: 4 },
					{ messageId: 'error', line: 5 },
					{ messageId: 'error', line: 6 },
				],
			},
			{
				code: `
					function a() { return 1; }
					function b() {
						if (true) return 1;
						else return 2;
					}
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					export default function a() {}
					const b = function () {}
					export default b
				`,
				options: [{ allowNonExports: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [
					{ messageId: 'error', line: 2 },
					{ messageId: 'error', line: 3 },
				],
			},
		],
	},
}

/**
 * @return {boolean}
 */
function hasJSXReturned(node) {
	if (node.body.type === 'JSXElement') {
		return true
	}

	if (node.body.type !== 'BlockStatement') {
		return false
	}

	const returnNodes = getReturnStatements(node.body)
	if (returnNodes.length === 0) {
		return false
	}

	return returnNodes.some(node => (/** @type {string} */ (node.argument?.type)) === 'JSXElement')
}

/**
 * Returns true, if and only if it violates the option
 * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node
 * @return {boolean}
 */
function hasMultipleNonVoidReturns(node) {
	if (node.body.type !== 'BlockStatement') {
		return false
	}

	const returnNodes = getReturnStatements(node.body)
	if (returnNodes.length === 0) {
		return false
	}

	const primaryReturnNode = node.body.body.find(node => node.type === 'ReturnStatement')
	const earlyReturnNodes = returnNodes.filter(node => node !== primaryReturnNode)

	if (earlyReturnNodes.length === 0) {
		return false
	}

	if (earlyReturnNodes.every(node =>
		!node.argument ||
		node.argument.type === 'Identifier' && node.argument.name === 'undefined' ||
		node.argument.type === 'UnaryExpression' && node.argument.operator === 'void'
	)) {
		return false
	}

	return true
}

/**
 * @param {import('estree').Node} node
 * @return {Array<import('estree').ReturnStatement>}
 */
function getReturnStatements(node) {
	if (!node) {
		return []

	} else if (node.type === 'ReturnStatement') {
		return [node]

	} else if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
		return []
	}

	/**
	 * @type {ReturnType<typeof getReturnStatements>}
	 */
	let results = []
	for (const key in node) {
		if (key === 'loc' || key === 'range' || key == 'parent') {
			continue
		}

		if (typeof node[key] === 'object' && node[key] !== null) {
			results = results.concat(getReturnStatements(node[key]))
		}
	}
	return results
}
