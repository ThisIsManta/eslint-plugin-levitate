'use strict'

const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce naming an identifier after the user-defined list of its `require` statement',
			category: 'Variables',
		},
		schema: [
			{ type: 'object' }
		],
		fixable: 'code',
	},
	create: function (context) {
		const ruleList = []
		if (context.options.length > 0 && _.isObject(context.options[0])) {
			_.forEach(context.options[0], function (requirePath, variableName) {
				let requirePathMatcher
				if (requirePath.startsWith('/')) {
					requirePathMatcher = new RegExp(requirePath.substring(1, requirePath.lastIndexOf('/'), requirePath.substring(requirePath.lastIndexOf('/') + 1)))
				} else {
					requirePathMatcher = new RegExp('^' + _.escapeRegExp(requirePath) + '$')
				}
				ruleList.push([requirePathMatcher, variableName])
			})
		}

		const sourceCode = context.getSourceCode()

		return {
			VariableDeclaration: function (rootNode) {
				if (rootNode.declarations.length === 0 || rootNode.declarations[0].type !== 'VariableDeclarator' || rootNode.declarations[0].init === null || rootNode.declarations[0].init.callee === undefined || rootNode.declarations[0].init.callee.name !== 'require' || rootNode.declarations[0].init.arguments.length === 0 || rootNode.declarations[0].init.arguments[0].type !== 'Literal') {
					return null
				}

				const workNode = rootNode.declarations[0]

				let workPath = workNode.init.arguments[0].value
				if (/^\.\.?\/.+/.test(workPath)) {
					workPath = workPath.replace(/\.js$/, '')
				}

				const actualVariableName = workNode.id.name || sourceCode.getText(workNode.id)

				for (const rule of ruleList) {
					const [requirePathMatcher, variableName] = rule
					if (requirePathMatcher.test(workPath)) {
						const expectVariableName = /\$\d/.test(variableName)
							? workPath.replace(requirePathMatcher, variableName)
							: variableName

						if (expectVariableName !== actualVariableName) {
							return context.report({
								node: workNode.id,
								message: `Expected "${actualVariableName}" to be "${expectVariableName}".`,
								fix: fixer => fixer.replaceText(workNode.id, expectVariableName)
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
				code: `const AAA = require('aaa')`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const AAA = require('./aaa')`,
				options: [{ 'AAA': '//aaa$/' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const AAA = require('./aaa')`,
				options: [{ 'AAA': '//aaa$/' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const AAA = require('aaa123')`,
				options: [{ 'AAA$1': '/aaa(\d+)/' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const XXX = require('AAA')`,
				options: [{ 'XXX': '/aaa/i' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const XXX = require('xxx')`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const AAA = require('aaa')`,
				options: [{ AAA: '//aaa$' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `const XXX = require('aaa')`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "XXX" to be "AAA".' }],
			},
			{
				code: `const { AAA } = require('aaa')`,
				options: [{ AAA: 'aaa' }],
				parserOptions: { ecmaVersion: 9, sourceType: 'module' },
				errors: [{ message: 'Expected "{ AAA }" to be "AAA".' }],
			},
		]
	}
}
