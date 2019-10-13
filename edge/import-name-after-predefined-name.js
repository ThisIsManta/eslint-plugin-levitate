'use strict'

const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing variable name after the user-defined list',
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
					return null
				}

				const workPath = root.source.value
				const workNode = root.specifiers.find(node => node.type === 'ImportNamespaceSpecifier' || node.type === 'ImportDefaultSpecifier')

				for (const rule of ruleList) {
					const [importPathMatcher, variableName] = rule
					if (importPathMatcher.test(workPath)) {
						if (workNode === undefined) {
							return context.report({
								node: root,
								message: `Expected to import "${variableName}" or "* as ${variableName}".`,
							})
						}

						if (workNode.local.name !== variableName) {
							return context.report({
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
	test: {
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
		],
		invalid: [
			{
				code: `import XXX from 'aaa'`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "XXX" to be "AAA".' }],
			},
			{
				code: `import { AAA } from 'aaa'`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected to import "AAA" or "* as AAA".' }
				],
			},
		]
	}
}
