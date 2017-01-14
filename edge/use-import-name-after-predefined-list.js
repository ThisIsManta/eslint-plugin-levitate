'use strict'

const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing variable name from the user-defined list',
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
			ImportDeclaration: function (rootNode) {
				if (rootNode.specifiers.length === 0) {
					return null
				}

				const name = rootNode.specifiers[0] && rootNode.specifiers[0].type === 'ImportDefaultSpecifier' && rootNode.specifiers[0].local.name || ''
				const path = rootNode.source.value

				if (nameDict[path] !== undefined && nameDict[path] !== name) {
					context.report({
						node: name ? rootNode.specifiers[0].local : rootNode,
						message: `Expected "${name}" to be "${nameDict[path]}".`,
						fix: fixer => fixer.replaceText(rootNode, `import ${nameDict[path]} from '${path}'`)
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
