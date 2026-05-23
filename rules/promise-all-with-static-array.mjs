// @ts-check

import { defineRule } from '@oxlint/plugins'
import _ from 'lodash'

export default defineRule({
	meta: {
		type: 'problem',
		docs: {
			description: 'enforce passing a static array to `Promise.all()`',
		},
		messages: {
			error: 'Expected `Promise.all()` to have a argument of a static array.',
		}
	},
	createOnce(context) {
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
})
