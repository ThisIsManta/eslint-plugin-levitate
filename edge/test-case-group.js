const _ = require('lodash')

const { getText } = require('./test-case-title')

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce using a function reference as a test case description',
		},
		messages: {
			direct: 'Expected the description to be the direct reference of the under-testing function by removing the string quotes',
		},
		fixable: 'code',
	},
	create: function (context) {
		return {
			ExpressionStatement: function (root) {
				const functionCall = _.get(root, 'expression.callee.name')
				if (functionCall !== 'describe') {
					return
				}

				const titleNode = _.get(root, 'expression.arguments.0')
				const titleText = getText(titleNode)
				if (_.isString(titleText) === false) {
					return
				}

				const scope = context.getScope()
				const matchingNode = scope.variables.find(node => node.name === titleText)
				if (!matchingNode) {
					return
				}

				if (matchingNode.references.some(ref => _.get(ref, 'identifier.parent.type') === 'CallExpression')) {
					return context.report({
						node: titleNode,
						messageId: 'direct',
						fix: fixer => fixer.replaceText(titleNode, titleText)
					})
				}
			},
		}
	},
	tests: {
		valid: [
			{
				code: `
				import { doSomething } from 'xxx'
				describe(doSomething, function() {
					it("does something", function() {
						doSomething()
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
				describe("doSomething", function() {
					it("does something", function() {
						doSomething()
					})
				})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'direct' }],
				output: `
				import { doSomething } from 'xxx'
				describe(doSomething, function() {
					it("does something", function() {
						doSomething()
					})
				})
				`
			},
		],
	},
}
