// @ts-check

import { defineRule } from '@oxlint/plugins'
import _ from 'lodash'

export default defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming an identifier after the user-defined list of its `require` statement',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: {
					type: 'string'
				}
			}
		],
		fixable: 'code',
	},
	createOnce(context) {
		const getRuleList = _.memoize(
			/**
			 * @return {Array<[string, RegExp]>} hash
			 */
			(hash) => Object.entries(hash ?? {})
				.map(([variableName, requirePath]) => {
					const matcher = requirePath.startsWith('/')
						? new RegExp(requirePath.substring(1, requirePath.lastIndexOf('/'), requirePath.substring(requirePath.lastIndexOf('/') + 1)))
						: new RegExp('^' + _.escapeRegExp(requirePath) + '$')
					return [variableName, matcher]
				}))

		return {
			VariableDeclarator(root) {
				if (
					!root.init ||
					root.init.type !== 'CallExpression' ||
					root.init.callee.type !== 'Identifier' ||
					root.init.callee.name !== 'require' ||
					root.init.arguments.length === 0
				) {
					return
				}

				const firstArgument = root.init.arguments[0]
				if (firstArgument.type !== 'Literal' || typeof firstArgument.value !== 'string') {
					return
				}

				const actualVariableName = root.id.type === 'Identifier' ? root.id.name : context.sourceCode.getText(root.id)
				const requirePath = firstArgument.value.replace(/\.(c|m)?jsx?$/, '')

				for (const [variableName, requirePathMatcher] of getRuleList(context.options[0])) {
					if (requirePathMatcher.test(requirePath)) {
						const expectVariableName = /\$\d/.test(variableName)
							? requirePath.replace(requirePathMatcher, variableName)
							: variableName

						if (expectVariableName !== actualVariableName) {
							context.report({
								node: root.id,
								message: `Expected "${actualVariableName}" to be "${expectVariableName}".`,
								fix: fixer => fixer.replaceText(root.id, expectVariableName)
							})
						}

						break
					}
				}
			}
		}
	}
})
