// @ts-check

const CONDITION = 'onlyIfMoreThanOneReturns'

/**
 * @type {import('eslint').Rule.RuleModule}
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
		 * @param {import('estree').FunctionDeclaration | import('estree').FunctionExpression | import('estree').ArrowFunctionExpression} node
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
	tests: process.env.TEST && {
		valid: [
			{
				code: `
					function x() {}
				`,
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
				options: [CONDITION],
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
					const x = () => {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export const x = () => ''
				`,
				options: [CONDITION],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export const x = () => { return '' }
				`,
				options: [CONDITION],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `
					export const x = (): string => { if (1) { return '' } return '' }
				`,
				options: [CONDITION],
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
				options: [CONDITION],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
		],
		invalid: [
			{
				code: `
					export function x() {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export function x() { if (true) return 1; else return 2; }
				`,
				options: [CONDITION],
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					const x = function() {}
					export default x
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => ''
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => {}
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => { return '' }
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => { if (1) { return '' } return '' }
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					const x = () => {}
					export default x
				`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
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
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
		],
	},
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
