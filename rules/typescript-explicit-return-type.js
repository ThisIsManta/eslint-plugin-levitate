/// <reference path="../types.d.ts" />
// @ts-check

const CONDITION = 'onlyIfMoreThanOneReturns'

/**
 * @type {Rule}
 */
module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'enforce writing an explicit return type for exported functions',
		},
		schema: [
			{
				enum: [null, CONDITION],
				default: null,
			}
		],
	},
	create: function (context) {
		const untypedFunctionHash = {}
		return {
			ExportNamedDeclaration: function (root) {
				if (!root.declaration) {
					return null
				}

				if (
					root.declaration.type === 'FunctionDeclaration' &&
					!('returnType' in root.declaration && root.declaration.returnType) &&
					checkForReturnViolation(root.declaration)
				) {
					return context.report({
						node: root.declaration,
						message: `Expected an exported function must have a return type.`,
					})
				}

				if (
					root.declaration.type === 'VariableDeclaration' &&
					root.declaration.declarations
				) {
					for (const node of root.declaration.declarations) {
						if (node.type !== 'VariableDeclarator') {
							continue
						}

						if ('typeAnnotation' in node.id && node.id.typeAnnotation) {
							continue
						}

						if (
							!node.init ||
							node.init.type !== 'ArrowFunctionExpression' && node.init.type !== 'FunctionExpression'
						) {
							continue
						}

						if ('returnType' in node.init && node.init.returnType) {
							continue
						}

						if (checkForReturnViolation(node.init)) {
							context.report({
								node: node,
								message: `Expected an exported function must have a return type.`,
							})
						}
					}
				}
			},
			FunctionDeclaration: function (root) {
				if (
					root.id &&
					root.id.type === 'Identifier' &&
					!('returnType' in root && root.returnType) &&
					checkForReturnViolation(root)
				) {
					untypedFunctionHash[root.id.name] = root
				}
			},
			VariableDeclarator: function (root) {
				if (
					root.id &&
					root.id.type === 'Identifier' &&
					!('typeAnnotation' in root.id && root.id.typeAnnotation) &&
					root.init &&
					(root.init.type === 'FunctionExpression' || root.init.type === 'ArrowFunctionExpression') &&
					!('returnType' in root.init && root.init.returnType) &&
					checkForReturnViolation(root.init)
				) {
					untypedFunctionHash[root.id.name] = root.init
				}
			},
			ExportDefaultDeclaration: function (root) {
				if (
					root.declaration &&
					root.declaration.type === 'Identifier' &&
					untypedFunctionHash[root.declaration.name]
				) {
					context.report({
						node: untypedFunctionHash[root.declaration.name],
						message: `Expected an exported function must have a return type.`,
					})
				}
			},
		}

		/**
		 * Returns true, if and only if it violates the option
		 * @param {ES.FunctionDeclaration | ES.FunctionExpression | ES.ArrowFunctionExpression} node
		 * @return {boolean}
		 */
		function checkForReturnViolation(node) {
			if (context.options[0] !== CONDITION) {
				return true
			}

			if (node.body.type !== 'BlockStatement') {
				return false
			}

			const returnNodes = getReturnStatements(node.body)
			if (returnNodes.length === 0) {
				return false
			}

			const mainReturnNode = node.body.body.find(node => node.type === 'ReturnStatement')
			const earlyReturnNodes = returnNodes.filter(node => node !== mainReturnNode)

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
	},
	tests: {
		valid: [
			{
				code: `
					function x() {}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export function x(): string {}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export function x() { return '' }
				`,
				options: [CONDITION],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = 1
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x = function(): string {}
					export default x
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x = () => {}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = () => ''
				`,
				options: [CONDITION],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = () => { return '' }
				`,
				options: [CONDITION],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = (): string => { if (1) { return '' } return '' }
				`,
				options: [CONDITION],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x: () => string = () => {}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x: () => string = () => {}
					export default x
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x = (): () => string => ''
					export default x
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
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
				options: [CONDITION],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `
					export function x() {}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export function x() { if (true) return 1; else return 2; }
				`,
				options: [CONDITION],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					const x = function() {}
					export default x
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => ''
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => {}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => { return '' }
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => { if (1) { return '' } return '' }
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					const x = () => {}
					export default x
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module', parser: require.resolve('@typescript-eslint/parser') },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export function x() {
						if (a) return
						if (b) return 2
						return 3
					}
				`,
				options: [CONDITION],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
		],
	},
}

/**
 * @param {ES.Node} node
 * @return {Array<ES.ReturnStatement>}
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
