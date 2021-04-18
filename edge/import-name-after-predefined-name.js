const _ = require('lodash')

module.exports = {
	meta: {
		/**
		 * Use import-convention rule instead
		 */
		deprecated: true,
		docs: {
			description: 'enforce naming an imported identifier after the user-defined list, for example given `["error", { "classnames": "cx" }]` then `import cx from "classnames"`',
			category: 'Variables',
		},
		schema: [
			{ type: 'object' }
		],
	},
	create: function (context) {
		const ruleList = []
		if (context.options.length > 0 && _.isObject(context.options[0])) {
			_.forEach(context.options[0], function (importPath, variableName) {
				let importPathMatcher
				if (importPath.startsWith('/')) {
					importPathMatcher = new RegExp(importPath.substring(1, importPath.lastIndexOf('/'), importPath.substring(importPath.lastIndexOf('/') + 1)))
				} else {
					importPathMatcher = new RegExp('^' + _.escapeRegExp(importPath) + '$')
				}
				ruleList.push([importPathMatcher, variableName])
			})
		}

		return {
			ImportDeclaration: function (root) {
				if (!root.specifiers || root.specifiers.length === 0) {
					return
				}

				const workPath = root.source.value
				const workNode = root.specifiers.find(node => node.type === 'ImportNamespaceSpecifier' || node.type === 'ImportDefaultSpecifier')
				if (!workNode) {
					return
				}

				for (const rule of ruleList) {
					const [importPathMatcher, variableName] = rule
					if (importPathMatcher.test(workPath)) {
						if (workNode.local.name !== variableName) {
							context.report({
								node: workNode.local,
								message: `Expected "${workNode.local.name}" to be "${variableName}".`,
							})
						}

						break
					}
				}
			}
		}
	},
	tests: {
		valid: [
			{
				code: `import AAA from 'aaa'`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import XXX from './aaa'`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import XXX from './xxx'`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import AAA from './aaa'`,
				options: [{ 'AAA': '//aaa$/' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import AAA from './aaa'`,
				options: [{ 'AAA': '//aaa$/' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import AAA from 'aaa123'`,
				options: [{ 'AAA$1': '/aaa(\d+)/' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import XXX from 'AAA'`,
				options: [{ 'XXX': '/aaa/i' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import { AAA } from 'aaa'`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `import XXX from 'aaa'`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "XXX" to be "AAA".' }],
			},
		]
	}
}
