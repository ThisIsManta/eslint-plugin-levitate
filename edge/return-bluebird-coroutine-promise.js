'use strict'

const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce calling Bluebird\'s `Promise.coroutine` when being used inside a function.',
			category: 'Possible Errors',
		},
	},
	create: function (context) {
		return {
			CallExpression: function (rootNode) {
				if (rootNode.callee.type !== 'MemberExpression' || rootNode.callee.object === undefined || rootNode.callee.object.type !== 'Identifier' || rootNode.callee.object.name !== 'Promise' || rootNode.callee.property === undefined || rootNode.callee.property.type !== 'Identifier' || rootNode.callee.property.name !== 'coroutine') {
					return null
				}

				if (rootNode.parent.type === 'ReturnStatement' || rootNode.parent.type === 'ArrowFunctionExpression') {
					context.report({
						node: rootNode,
						message: `Expected "Promise.coroutine" to be called immediately.`,
					})
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `function x() { return Promise.coroutine()() }`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `var x = () => Promise.coroutine()()`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `var x = () => { Promise.coroutine()() }`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `var x = Promise.coroutine()`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `function x() { return Promise.coroutine() }`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "Promise.coroutine" to be called immediately.' }],
			}, {
				code: `var x = () => Promise.coroutine()`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "Promise.coroutine" to be called immediately.' }],
			},
		]
	}
}
