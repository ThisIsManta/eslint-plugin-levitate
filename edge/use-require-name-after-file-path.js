const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing variable name from the file name of `require` statements',
			category: 'Variables',
		},
		fixable: 'code'
	},
	create: function (context) {
		return {
			VariableDeclaration: function (rootNode) {
				if (rootNode.declarations[0].type !== 'VariableDeclarator' || rootNode.declarations[0].init.callee === undefined || rootNode.declarations[0].init.callee.name !== 'require' || rootNode.declarations[0].init.arguments.length === 0 || rootNode.declarations[0].init.arguments[0].type !== 'Literal') {
					return null
				}

				const workNode = rootNode.declarations[0]
				const filePath = workNode.init.arguments[0].value.replace(/\.js$/, '')
				if (/^\.\.?\/.+/.test(filePath) === false || workNode.id.type !== 'Identifier') {
					return null
				}

				const actualName = workNode.id.name
				const properName = _.chain(filePath.split('/')).last().camelCase().value().replace(/^\w/, char => char.toUpperCase())

				if (actualName !== properName) {
					return context.report({
						node: workNode.id,
						message: `Expected "${actualName}" to be "${properName}".`,
					})
				}
			}
		}
	},
	test: {
		valid: [
			'var JamesArthur = require("./james-arthur")',
			'var anything = require("shawn-mendes")',
		],
		invalid: [
			{
				code: 'var something = require("./james-arthur")',
				errors: [{ message: 'Expected "something" to be "JamesArthur".', }]
			},
		]
	}
}
