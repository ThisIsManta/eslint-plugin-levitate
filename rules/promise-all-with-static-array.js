/// <reference path="../types.d.ts" />
// @ts-check

const _ = require('lodash')

/**
 * @type {Rule}
 */
module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'enforce passing a static array to `Promise.all()`',
		},
		messages: {
			error: 'Expected `Promise.all()` to have a argument of a static array.',
		}
	},
	create: function (context) {
		return {
			CallExpression: function (root) {
				if ((
					root.callee.type === 'MemberExpression' &&
					root.callee.object.type === 'Identifier' &&
					root.callee.object.name === 'Promise' &&
					root.callee.property.type === 'Identifier' &&
					root.callee.property.name === 'all' &&
					root.arguments.length > 0
				) === false) {
					return
				}

				const firstArgument = root.arguments[0]
				if (
					firstArgument.type !== 'ArrayExpression' ||
					firstArgument.elements.some(node => node?.type === 'SpreadElement')
				) {
					context.report({
						node: firstArgument,
						messageId: 'error',
					})
				}
			}
		}
	},
	tests: {
		valid: [
			{ code: 'Promise.all()' },
			{ code: 'Promise.all([])' },
			{ code: 'Promise.all([1, 2, 3])' },
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.all([1, 2, 3])
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: 'Promise.all([1, 2, 3, ...x])',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'error', }]
			},
			{
				code: 'Promise.all(x)',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'error', }]
			},
		]
	}
}
