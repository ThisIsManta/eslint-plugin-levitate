'use strict'

const INDEX = /\/index(\.\w+)?$/

const INDEX_INTERNAL = /^\.\.?(\/\.\.)*\/index/

module.exports = {
	meta: {
		docs: {
			description: 'disallow writing index file in an import path, except for "./index"',
			category: 'ECMAScript 6',
		},
		fixable: 'code',
	},
	create: function (context) {
		return {
			ImportDeclaration: function (root) {
				const path = root.source.value
				if (path.startsWith('.') && INDEX.test(path) && INDEX_INTERNAL.test(path) === false) {
					const expectedPath = path.replace(INDEX, '')
					return context.report({
						node: root.source,
						message: `Expected "${path}" to be "${expectedPath}".`,
						fix: fixer => fixer.replaceText(root.source, expectedPath)
					})
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `import AAA from 'aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import AAA from './aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import AAA from '../aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import XXX from './index'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import XXX from '../../../index'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `import XXX from '../src/index'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "../src/index" to be "../src".' }],
			},
		]
	}
}
