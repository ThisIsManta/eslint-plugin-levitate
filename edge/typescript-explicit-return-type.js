const _ = require('lodash')

const CONDITION = 'onlyIfMoreThanOneReturns'

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing an explicit return type for exported functions',
			category: 'Possible Errors',
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

				if (root.declaration.type === 'FunctionDeclaration' && !root.declaration.returnType) {
					context.report({
						node: root.declaration,
						message: `Expected an exported function must have a return type.`,
					})
				}

				if (root.declaration.type === 'VariableDeclaration' && root.declaration.declarations) {
					for (const node of root.declaration.declarations) {
						if (node.type !== 'VariableDeclarator') {
							continue
						}

						if (node.id.typeAnnotation) {
							continue
						}

						if (!node.init || node.init.type !== 'ArrowFunctionExpression' && node.init.type !== 'FunctionExpression') {
							continue
						}

						if (node.init.returnType) {
							continue
						}

						if (checkReturns(node.init)) {
							context.report({
								node: node,
								message: `Expected an exported function must have a return type.`,
							})
						}
					}
				}
			},
			FunctionDeclaration: function (root) {
				if (root.id && root.id.type === 'Identifier' && !root.returnType && checkReturns(root)) {
					untypedFunctionHash[root.id.name] = root
				}
			},
			VariableDeclarator: function (root) {
				if (
					root.id && root.id.type === 'Identifier' && !root.id.typeAnnotation &&
					root.init && (root.init.type === 'FunctionExpression' || root.init.type === 'ArrowFunctionExpression') && !root.init.returnType &&
					checkReturns(root.init)
				) {
					untypedFunctionHash[root.id.name] = root.init
				}
			},
			ExportDefaultDeclaration: function (root) {
				if (root.declaration && root.declaration.type === 'Identifier' && untypedFunctionHash[root.declaration.name]) {
					context.report({
						node: untypedFunctionHash[root.declaration.name],
						message: `Expected an exported function must have a return type.`,
					})
				}
			},
		}

		// Return true, if and only if it violates the option
		function checkReturns(node) {
			if (context.options[0] !== CONDITION) {
				return true
			}

			if (node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement') {
				return false
			}

			const numberOfReturns = countReturns(node.body)
			if (numberOfReturns === 0) {
				return false

			} else if (numberOfReturns === 1) {
				// In case that the only `return` is not written in the main block
				return node.body.body.find(node => node.type === 'ReturnStatement') === undefined

			} else {
				return true
			}
		}
	},
	test: {
		valid: [
			{
				code: `
					function x() {}
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export function x(): string {}
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = 1
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x = function(): string {}
					export default x
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x = () => {}
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = () => ''
				`,
				options: [CONDITION],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = () => { return '' }
				`,
				options: [CONDITION],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = (): string => { if (1) { return '' } return '' }
				`,
				options: [CONDITION],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x: () => string = () => {}
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x: () => string = () => {}
					export default x
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x = (): () => string => ''
					export default x
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `
					export function x() {}
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					const x = function() {}
					export default x
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => ''
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => {}
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => { return '' }
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => { if (1) { return '' } return '' }
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					const x = () => {}
					export default x
				`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module', parser: 'typescript-eslint-parser' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
		],
	},
}

function countReturns(node) {
	if (!node) {
		return 0

	} else if (node.type === 'ReturnStatement') {
		return 1

	} else if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
		return 0
	}

	let count = 0
	for (const name in node) {
		if (name === 'loc' || name === 'range') {
			continue
		}

		if (typeof node[name] === 'object') {
			count += countReturns(node[name])
		}
	}
	return count
}
