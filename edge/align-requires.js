const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce white-space padding after the variable name of `require` statements.',
			category: 'Stylistic Issues',
		},
		schema: [
			{ type: 'integer', minimum: 1, multipleOf: 1 }
		],
		fixable: 'code'
	},
	create: function (context) {
		const nameTotal = context.options[0] || 1

		return {
			VariableDeclaration: function (rootNode) {
				if (rootNode.declarations[0].type !== 'VariableDeclarator' || rootNode.declarations[0].init.callee.name !== 'require' || rootNode.declarations[0].init.arguments.length === 0 || rootNode.declarations[0].init.arguments[0].type !== 'Literal') {
					return null
				}

				const workNode = rootNode.declarations[0]
				const nameCount = workNode.id.end - workNode.id.start
				const nameSpace = Math.max(nameTotal - nameCount, 0)

				if (nameCount + nameSpace !== workNode.init.start - workNode.id.start - 3) {
					return context.report({
						node: workNode.id,
						message: `Expected "${context.getSourceCode().getText(workNode.id).trim()}" to have a trailing white-space of ${nameSpace}.`,
						fix: fixer => fixer.replaceTextRange([workNode.id.start, workNode.init.start], padRight(context.getSourceCode().getText(workNode.id).trim(), nameTotal) + ' = ')
					})
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `const a     = require('a')`,
				options: [5],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `const abcedfgh = require('a')`,
				options: [5],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `const x = require('z')`,
				options: [5],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected "x" to have a trailing white-space of 4.' }
				],
				output: `const x     = require('z')`
			},
			{
				code: `const x        = require('z')`,
				options: [5],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected "x" to have a trailing white-space of 4.' }
				],
				output: `const x     = require('z')`
			},
		]
	}
}

function padRight(text, numb) {
	text = (text || '').toString()
	while (text.length < numb) {
		text = text + ' '
	}
	return text
}
