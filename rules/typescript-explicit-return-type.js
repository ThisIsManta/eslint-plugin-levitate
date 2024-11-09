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
		const { allowNonExports, allowSingleValueReturns } = Object.assign(
			{ allowNonExports: false, allowSingleValueReturns: false },
			context.options[0]
		)

		return {
			FunctionDeclaration: function (root) {
				if ('returnType' in root && root.returnType) {
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
					function x() {}
				`,
				options: [{ allowNonExports: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export function x(): string {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export function x() { return '' }
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export const x = 1
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					const x = function(): string {}
					export default x
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					function x(): string {}
					export default x
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					const x = () => {}
				`,
				options: [{ allowNonExports: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export const x = () => ''
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export const x = () => { return '' }
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export const x = (): string => { if (1) { return '' } return '' }
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export default function x() { return '' }
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export const x: () => string = () => {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					const x: () => string = () => {}
					export default x
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					const x = (): () => string => ''
					export default x
				`,
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
          function x() {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error', column: 22, endColumn: 23 }],
			},
			{
				code: `
					export function x() {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					export function x() { if (true) return 1; else return 2; }
				`,
				options: [{ allowSingleValueReturns: false }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					const x = function() {}
					export default x
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					export const x = () => ''
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					const x = () => ''
					export { x }
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
          export const x = () => {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error', column: 29, endColumn: 30 }],
			},
			{
				code: `
					export const x = () => { return '' }
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					export const x = () => { if (1) { return '' } return '' }
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					const x = () => {}
					export default x
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					export function x() {
						if (a) return
						if (b) return 2
						return 3
					}
				`,
				options: [{ allowSingleValueReturns: true }],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ messageId: 'error' }],
			},
		],
	},
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

		if (typeof node[key] === 'object') {
			results = results.concat(getReturnStatements(node[key]))
		}
	}
	return results
}
