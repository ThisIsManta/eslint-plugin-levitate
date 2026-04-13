// @ts-check

import _ from 'lodash'

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'enforce passing a static array to `Promise.all()`',
		},
		messages: {
			error: 'Expected `Promise.all()` to have a argument of a static array.',
		}
	},
	create(context) {
		return {
			CallExpression(root) {
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
}
