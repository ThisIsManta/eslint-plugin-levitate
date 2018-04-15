const _ = require('lodash')
const fp = require('path')
const glob = require('glob').sync

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing variable name from the file name of `require` statements',
			category: 'Variables',
		},
		schema: [
			{
				type: 'array',
				items: {
					type: 'string'
				}
			}
		],
		fixable: 'code'
	},
	create: function (context) {
		return {
			VariableDeclaration: function (rootNode) {
				if (rootNode.declarations[0].type !== 'VariableDeclarator' || rootNode.declarations[0].init === null || rootNode.declarations[0].init.callee === undefined || rootNode.declarations[0].init.callee.name !== 'require' || rootNode.declarations[0].init.arguments.length === 0 || rootNode.declarations[0].init.arguments[0].type !== 'Literal') {
					return null
				}

				const workNode = rootNode.declarations[0]
				const filePath = workNode.init.arguments[0].value.replace(/\.js$/, '')
				if (/^\.\.?\/.+/.test(filePath) === false || workNode.id.type !== 'Identifier') {
					return null
				}

				const actualName = workNode.id.name
				const properName = _.chain(filePath.split('/')).last().camelCase().value().replace(/^\w/, char => char.toUpperCase())

				if (context.options.length > 0 && context.options[0].length > 0) {
					const fullPath = fp.resolve(context.getFilename())/*.split(/\\|\//g)*/
					let index = -1
					let found = false
					while (++index < context.options[0].length) {
						const testPaths = glob(context.options[0][index]).map(item => fp.resolve(item))
						if (testPaths.some(item => item === fullPath)) {
							found = true
							break
						}
					}
					if (!found) {
						return null
					}
				}

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
			'var something = require("shawn-mendes")',
			'var JamesArthur = require("./james-arthur")',
			{
				code: 'var JamesArthur = require("./james-arthur")',
				filename: './edge/use-require-name-after-file-path.js',
				options: [['./edge/*.js']],
			},
			{
				code: 'var something = require("./james-arthur")',
				filename: './edge/use-require-name-after-file-path.js',
				options: [['./nada.js']],
			},
		],
		invalid: [
			{
				code: 'var something = require("./james-arthur")',
				errors: [{ message: 'Expected "something" to be "JamesArthur".', }]
			},
			{
				code: 'var something = require("./james-arthur")',
				filename: './edge/use-require-name-after-file-path.js',
				options: [['./edge/*.js']],
				errors: [{ message: 'Expected "something" to be "JamesArthur".', }]
			},
		]
	}
}
