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
		fixable: 'code',
	},
	create: function (context) {
		let nameDict = {}
		if (context.options.length > 0 && _.isObject(context.options[0])) {
			_.forEach(context.options[0], function (path, name) {
				nameDict[path] = name
			})
		}

		return {
			ImportDeclaration: function (root) {
				if (!root.specifiers || root.specifiers.length === 0) {
					return null
				}

				const path = root.source.value
				if (nameDict[path] === undefined) {
					return null
				}

				if (root.specifiers.length > 1 || root.specifiers.some(node => node.type === 'ImportDefaultSpecifier') === false) {
					return context.report({
						node: root,
						message: `Expected to import "${nameDict[path]}".`,
						fix: fixer => fixer.replaceText(root, `import ${nameDict[path]} from '${path}'`)
					})
				}

				const name = root.specifiers.find(node => node.type === 'ImportDefaultSpecifier').local.name
				if (nameDict[path] !== name) {
					return context.report({
						node: name ? root.specifiers[0].local : root,
						message: `Expected "${name}" to be "${nameDict[path]}".`,
						fix: fixer => fixer.replaceText(root, `import ${nameDict[path]} from '${path}'`)
					})
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
					{ message: 'Expected to import "AAA".' }
				],
			},
		]
	}
}
