// @ts-check

import { defineRule } from '@oxlint/plugins'
import _ from 'lodash'
import { tryParseBoolean } from '../utils.mjs'

export default defineRule({
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
	createOnce(context) {
		let allowJSX = false
		let allowNonExports = false
		let allowSingleValueReturns = false

		return {
			before() {
				allowJSX = tryParseBoolean(context.options[0], 'allowJSX') ?? false
				allowNonExports = tryParseBoolean(context.options[0], 'allowNonExports') ?? false
				allowSingleValueReturns = tryParseBoolean(context.options[0], 'allowSingleValueReturns') ?? false
			},
			FunctionDeclaration(root) {
				if ('returnType' in root && root.returnType) {
					return
				}

				if (allowJSX && hasJSXReturned(root, context.sourceCode.visitorKeys)) {
					return
				}

				if (allowSingleValueReturns && !hasMultipleNonVoidReturns(root, context.sourceCode.visitorKeys)) {
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

				if (!root.loc || !root.body) {
					return
				}

				context.report({
					loc: context.sourceCode.getTokenBefore(root.body, { includeComments: false })?.loc ?? root.loc,
					messageId: 'error',
				})
			},
			VariableDeclarator(root) {
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

				if (allowJSX && hasJSXReturned(root.init, context.sourceCode.visitorKeys)) {
					return
				}

				if (allowSingleValueReturns && !hasMultipleNonVoidReturns(root.init, context.sourceCode.visitorKeys)) {
					return
				}

				if (allowNonExports && !(
					root.parent?.parent?.type === 'ExportDefaultDeclaration' ||
					root.parent?.parent?.type === 'ExportNamedDeclaration' ||
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

				if (!root.id.loc || !root.init.body) {
					return
				}

				context.report({
					loc: context.sourceCode.getTokenBefore(root.init.body, { filter: token => token.type === 'Punctuator' && token.value === ')' })?.loc ?? root.id.loc,
					messageId: 'error',
				})
			},
		}
	},
})

/**
 * @param {import('@oxlint/plugins').ESTree.Function | import('@oxlint/plugins').ESTree.ArrowFunctionExpression} node
 * @param {import('@oxlint/plugins').SourceCode['visitorKeys']} visitorKeys
 * @return {boolean}
 */
function hasJSXReturned(node, visitorKeys) {
	if (!node.body) {
		return false
	}

	if (node.body.type === 'JSXElement') {
		return true
	}

	if (node.body.type !== 'BlockStatement') {
		return false
	}

	const returnNodes = getReturnStatements(node.body, visitorKeys)
	if (returnNodes.length === 0) {
		return false
	}

	return returnNodes.some(node => (/** @type {string} */ (node.argument?.type)) === 'JSXElement')
}

/**
 * Returns true, if and only if it violates the option
 * @param {import('@oxlint/plugins').ESTree.Function | import('@oxlint/plugins').ESTree.ArrowFunctionExpression} node
 * @param {import('@oxlint/plugins').SourceCode['visitorKeys']} visitorKeys
 * @return {boolean}
 */
function hasMultipleNonVoidReturns(node, visitorKeys) {
	if (node.body?.type !== 'BlockStatement') {
		return false
	}

	const returnNodes = getReturnStatements(node.body, visitorKeys)
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
 * @param {import('@oxlint/plugins').ESTree.Node} node
 * @param {import('@oxlint/plugins').SourceCode['visitorKeys']} visitorKeys
 * @return {Array<import('@oxlint/plugins').ESTree.ReturnStatement>}
 */
function getReturnStatements(node, visitorKeys) {
	if (typeof node !== 'object' || node === null || !('type' in node)) {
		return []
	}

	if (node.type === 'ReturnStatement') {
		return [node]
	}

	if (
		node.type === 'FunctionDeclaration' ||
		node.type === 'FunctionExpression' ||
		node.type === 'ArrowFunctionExpression'
	) {
		return []
	}

	if (node.type in visitorKeys) {
		/**
		 * @type {Array<import('@oxlint/plugins').ESTree.ReturnStatement>}
		 */
		const output = []
		for (const key of visitorKeys[node.type]) {
			if (key in node) {
				const child = /** @type {*} */(node)[key]
				if (Array.isArray(child)) {
					output.push(...child.flatMap(stub => getReturnStatements(stub, visitorKeys)))
				} else if (child) {
					output.push(...getReturnStatements(child, visitorKeys))
				}
			}
		}
		return output
	}

	return []
}
