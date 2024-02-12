/// <reference path="../types.d.ts" />
// @ts-check

const _ = require('lodash')

const { getText } = require('./test-case-title')

/**
 * @type {RuleModule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce using a function reference as a test case description',
		},
		messages: {
			unexpected: 'Expected a describe title to be an object name, a namespace or a function name',
			unused: 'Expected the identifier with the same name to be used inside the describe block',
		},
		fixable: 'code',
	},
	create: function (context) {
		return {
			ExpressionStatement: function (root) {
				if (
					root.expression.type !== 'CallExpression' ||
					root.expression.callee.type !== 'Identifier' ||
					root.expression.callee.name !== 'describe' ||
					root.expression.arguments.length < 2
				) {
					return
				}

				const describeNameNode = root.expression.arguments[0]
				if (!describeNameNode) {
					return
				}

				const describeBlockNode = 'body' in root.expression.arguments[1] ? root.expression.arguments[1].body : null
				if (!describeBlockNode) {
					return
				}

				const currentScope = context.sourceCode.getScope(describeNameNode)

				/**
				 * @param {import('eslint').Scope.Scope} [scope=currentScope]
				 * @return {Array<string>}
				 */
				function getAllVariables(scope = currentScope) {
					if (!scope || scope.type === 'global') {
						return []
					}

					return [...scope.variables.map(variable => variable.name), ...(scope.upper ? getAllVariables(scope.upper) : [])]
				}

				const targetNodes = (/** @return {Array<NodeLike>} */ () => {
					if (describeNameNode.type === 'Identifier' || describeNameNode.type === 'MemberExpression') {
						return [getNodeLike(describeNameNode)]
					}

					const describeName = getText(describeNameNode)
					if (typeof describeName === 'string' && describeName.trim().length > 0) {
						const [objectName, ...propertyAccessorNames] = describeName.split('.')
						if (propertyAccessorNames.length === 0) {
							return [
								{ type: 'Identifier', name: objectName },
								...(getAllVariables().map(name => ({
									type: /** @type {const} */ ('MemberExpression'),
									object: { type: 'Identifier', name },
									property: { type: 'Identifier', name: objectName }
								})))
							]
						}

						return [
							propertyAccessorNames.reduce((object, name) => ({
								type: 'MemberExpression',
								object,
								property: { type: 'Identifier', name }
							}), /** @type {NodeLike} */({ type: 'Identifier', name: objectName }))
						]
					}

					return []
				})()
				if (targetNodes.length === 0) {
					return
				}

				const describeBlockScope = context.sourceCode.getScope(describeBlockNode)

				/**
				 * @param {import('eslint').Scope.Scope} scope
				 * @return {boolean}
				 */
				function isUsedInDescribeBlock(scope) {
					if (scope === describeBlockScope) {
						return true
					}

					if (!scope.upper) {
						return false
					}

					return isUsedInDescribeBlock(scope.upper)
				}

				for (const targetNode of targetNodes) {
					const partialMatchingVariable = getVariable(currentScope, getObjectName(targetNode))
					if (!partialMatchingVariable) {
						continue
					}

					const fullyMatchingVariables = partialMatchingVariable.references.filter(ref => {
						if (targetNode.type === 'Identifier' && _.isMatch(ref.identifier, targetNode)) {
							return true
						}

						return _.isMatch(getFullPropertyAccessorNode(ref.identifier), targetNode)
					})
					if (fullyMatchingVariables.length === 0) {
						continue
					}

					if (!fullyMatchingVariables.some(ref => isUsedInDescribeBlock(ref.from))) {
						context.report({
							node: describeNameNode,
							messageId: 'unused',
						})
					}

					return
				}

				context.report({
					node: describeNameNode,
					messageId: 'unexpected',
				})
			},
		}
	},
	tests: {
		valid: [
			{
				code: `
				describe('xxx')
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				describe('', function() {})
				describe('', () => {})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				import { func } from 'xxx'
				describe('func', function() {
					it('xxx', function() {
						func()
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				import { func } from 'xxx'
				describe(func, function() {
					it('xxx', function() {
						func()
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				import { foo, bar } from 'xxx'
				describe('foo', function() {
					describe('bar', function() {
						it('xxx', function() {
							foo()
							bar()
						})
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				import { object } from 'xxx'
				describe('object', function() {
					it('xxx', function() {
						expect(object).toEqual({})
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				import * as Namespace from 'xxx'
				describe('Namespace.property.func', function() {
					it('xxx', function() {
						expect(Namespace.property.func())
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				import * as Namespace from 'xxx'
				describe(Namespace.func, function() {
					it('xxx', function() {
						expect(Namespace.func())
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				import * as Namespace from 'xxx'
				describe('func', function() {
					it('xxx', function() {
						expect(Namespace.func())
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
				import { func } from 'xxx'
				describe('func', function() {
					it('xxx', function() {
						expect(func.call())
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `
				import { doSomething } from 'xxx'
				describe('something else', function() {
					it('xxx', function() {
						doSomething()
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'unexpected' }],
			},
			{
				code: `
				import { doSomething } from 'xxx'
				describe(doSomething, function() {
				})
				doSomething()
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'unused' }],
			},
		],
	},
}

/**
 * @typedef {Pick<ES.Identifier, 'type' | 'name'> | Pick<ES.Node, 'type'> | { type: 'MemberExpression', object: NodeLike, property: NodeLike }} NodeLike
 */

/**
 * @param {ES.Node} node
 * @return {NodeLike}
 */
function getNodeLike(node) {
	if (node.type === 'MemberExpression') {
		return { type: 'MemberExpression', object: getNodeLike(node.object), property: getNodeLike(node.property) }
	}

	if (node.type === 'Identifier') {
		return _.pick(node, 'type', 'name')
	}

	return _.pick(node, 'type')
}

/**
 * @param {NodeLike} node
 * @return {string}
 */
function getObjectName(node) {
	if (node.type === 'Identifier' && 'name' in node) {
		return node.name
	}

	if (node.type === 'MemberExpression' && 'object' in node) {
		return getObjectName(node.object)
	}

	return ''
}

/**
 * @param {import('eslint').Scope.Scope} scope
 * @param {string} name
 */
function getVariable(scope, name) {
	const variable = scope.variables.find(variable => variable.name === name)
	if (variable) {
		return variable
	}

	if (!scope.upper) {
		return null
	}

	return getVariable(scope.upper, name)
}

/**
 * @param {NodeLike & Partial<WithParent<NodeLike>>} node
 */
function getFullPropertyAccessorNode(node) {
	if (node.parent && node.parent.type === 'MemberExpression') {
		return getFullPropertyAccessorNode(node.parent)
	}

	return node
}
