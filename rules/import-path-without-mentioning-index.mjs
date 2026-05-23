// @ts-check

import { defineRule } from '@oxlint/plugins'

const index = /\/index(\.(m|c)?(j|t)sx?)?$/
const indexInSubdirectory = /^\.\.?(\/\.\.)*\/index/

export default defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing an import path pointing to an index file without mentioning "index", unless both are in the same directory',
		},
		fixable: 'code',
	},
	createOnce(context) {
		return {
			ImportDeclaration(root) {
				const path = root.source.value
				if (!path.startsWith('.')) {
					return
				}

				if (path === '.') {
					context.report({
						node: root.source,
						message: `Expected /index here.`,
						fix: fixer => fixer.insertTextAfter(
							{
								range: [
									root.source.range[1] - 1,
									root.source.range[1] - 1
								]
							},
							'/index'
						)
					})
					return
				}

				if (!index.test(path) || indexInSubdirectory.test(path)) {
					return
				}

				const expectedPath = path.replace(index, '')
				context.report({
					node: root.source,
					message: `Unexpected ${path.match(index)?.[0]} here.`,
					fix: fixer => fixer.replaceText(
						{
							range: [
								root.source.range[0] + 1,
								root.source.range[1] - 1
							]
						},
						expectedPath
					)
				})
			}
		}
	}
})
