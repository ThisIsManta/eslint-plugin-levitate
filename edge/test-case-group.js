const _ = require('lodash')

const { getText } = require('./test-case-title')

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce using a function reference as a test case description',
		},
		fixable: 'code',
	},
	create: function (context) {
		return {
			ExpressionStatement: function (root) {
				const describeBlockFound = _.isMatch(root, { expression: { type: 'CallExpression', callee: { type: 'Identifier', name: 'describe' } } })
				if (!describeBlockFound) {
					return
				}

				const describeNameNode = _.get(root, 'expression.arguments.0')
				if (!describeNameNode) {
					return
				}

				const describeName = getText(describeNameNode)
				if (typeof describeName === 'string') {
					if (describeName.trim().length === 0) {
						return
					}

					const [objectName, ...propertyAccessorName] = describeName.split('.')
					const testingNodes = _.compact([
						propertyAccessorName.reduce((object, name) => {
							return { type: 'MemberExpression', object, property: { type: 'Identifier', name } }
						}, { type: 'Identifier', name: objectName }),
						propertyAccessorName.length === 0 && { type: 'MemberExpression', property: { type: 'Identifier', name: describeName } },
					])

					if (!lookForObject(testingNodes) && !lookForFunctionCall(testingNodes)) {
						context.report({
							node: describeNameNode,
							message: 'Expected the describe block name to match an object name, a namespace or a function name',
						})
					}

				} else if (describeNameNode.type === 'Identifier' || describeNameNode.type === 'MemberExpression') {
					const testingNodes = [copyNode(describeNameNode)]
					if (!lookForFunctionCall(testingNodes)) {
						context.report({
							node: describeNameNode,
							message: 'Expected the identifier to be a function being called somewhere in the describe block',
						})
					}
				}

				function lookForObject(testingNodes) {
					const { variables } = context.getScope()
					return variables.some(variable =>
						variable.defs.some(({ name }) => {
							return testingNodes.filter(({ type }) => type === 'Identifier').some(testingNode => _.isMatch(name, testingNode))
						}) ||
						variable.references.some(({ identifier }) => {
							return testingNodes.filter(({ type }) => type === 'MemberExpression').some(testingNode => findParentNode(identifier, testingNode))
						})
					)
				}

				function lookForFunctionCall(testingNodes) {
					const { variables } = context.getScope()
					return variables.some(variable => variable.references.some(({ identifier }) => {
						const functionCallNode = findFunctionCallNode(identifier)
						if (functionCallNode) {
							return testingNodes.some(testingNode => _.isMatch(functionCallNode, { callee: testingNode }))
						}

						return false
					}))
				}
			},
		}
	},
	tests: {
		valid: [
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
				errors: [{ message: 'Expected the describe block name to match an object name, a namespace or a function name' }],
			},
			{
				code: `
				import { doSomething } from 'xxx'
				describe(doSomething, function() {
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the identifier to be a function being called somewhere in the describe block' }],
			},
			{
				code: `
				import * as Namespace from 'xxx'
				describe(Namespace.func, function() {
					it('xxx', function() {
						expect(Namespace.func)
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the identifier to be a function being called somewhere in the describe block' }],
			},
		],
	},
}

function copyNode(node) {
	if (node.type === 'MemberExpression') {
		return { type: 'MemberExpression', object: copyNode(node.object), property: copyNode(node.property) }
	}

	if (node.type === 'Identifier') {
		return _.pick(node, 'type', 'name')
	}

	return _.pick(node, 'type')
}

function findParentNode(node, findingNode) {
	if (!node) {
		return null
	}

	if (_.isMatch(node, findingNode)) {
		return node
	}

	return findParentNode(node.parent, findingNode)
}

function findFunctionCallNode(node) {
	if (!node || !node.parent) {
		return null
	}

	if (node.parent.type === 'CallExpression' && node.parent.callee === node) {
		return node.parent
	}

	if (node.parent.type === 'MemberExpression' && node.parent.object === node) {
		return findFunctionCallNode(node.parent)
	}

	return null
}
