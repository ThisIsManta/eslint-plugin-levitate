const INDEX = /\/index(\.\w+)?$/

const INDEX_INTERNAL = /^\.\.?(\/\.\.)*\/index/

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing an import path to an index file without mentioning "index.js"',
		},
		fixable: 'code',
	},
	create: function (context) {
		return {
			ImportDeclaration: function (root) {
				const path = root.source.value
				const quote = root.source.raw.charAt(0)
				if (path.startsWith('.') && INDEX.test(path) && INDEX_INTERNAL.test(path) === false) {
					const expectedPath = path.replace(INDEX, '')
					return context.report({
						node: root.source,
						message: `Expected "${path}" to be "${expectedPath}".`,
						fix: fixer => fixer.replaceText(root.source, quote + expectedPath + quote)
					})
				}
			}
		}
	},
	tests: {
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
				output: `import XXX from '../src'`,
			},
		]
	}
}
