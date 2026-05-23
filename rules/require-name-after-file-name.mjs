// @ts-check

import { defineRule } from '@oxlint/plugins'
import fp from 'path'
import _ from 'lodash'
import { globSync } from 'glob'

export default defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming an identifier after the file name of its `require` statement',
		},
		schema: [
			{
				type: 'array',
				items: {
					type: 'string'
				}
			}
		],
	},
	createOnce(context) {
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

				const filePath = firstArgument.value.replace(/\.(c|m)?jsx?$/, '')
				if (/^\.\.?\/.+/.test(filePath) === false || root.id.type !== 'Identifier') {
					return
				}

				const actualName = root.id.name
				const properName = _.chain(filePath.split('/')).last().camelCase().value().replace(/^\w/, char => char.toUpperCase())

				if (Array.isArray(context.options[0])) {
					const fullPath = fp.resolve(context.filename)
					let index = -1
					let found = false
					while (++index < context.options[0].length) {
						const entry = context.options[0][index]
						if (typeof entry !== 'string') {
							continue
						}
						const testPaths = globSync(entry).map(item => fp.resolve(item))
						if (testPaths.some(item => item === fullPath)) {
							found = true
							break
						}
					}
					if (!found) {
						return
					}
				}

				if (actualName !== properName) {
					context.report({
						node: root.id,
						message: `Expected "${actualName}" to be "${properName}".`,
					})
				}
			}
		}
	}
})
