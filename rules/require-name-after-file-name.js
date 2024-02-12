/// <reference path="../types.d.ts" />
// @ts-check

const _ = require('lodash')
const fp = require('path')
const glob = require('glob').sync

/**
 * @type {RuleModule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming an identifier after the file name of its `require` statement',
		},
		schema: [
			{
				type: 'array',
				items: {
					type: 'string'
				}
			}
		],
	},
	create: function (context) {
		return {
			VariableDeclarator: function (root) {
				if (
					!root.init ||
					root.init.type !== 'CallExpression' ||
					root.init.callee.type !== 'Identifier' ||
					root.init.callee.name !== 'require' ||
					root.init.arguments.length === 0
				) {
					return
				}

				const firstArgument = root.init.arguments[0]
				if (firstArgument.type !== 'Literal' || typeof firstArgument.value !== 'string') {
					return
				}

				const filePath = firstArgument.value.replace(/\.(c|m)?jsx?$/, '')
				if (/^\.\.?\/.+/.test(filePath) === false || root.id.type !== 'Identifier') {
					return
				}

				const actualName = root.id.name
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
						return
					}
				}

				if (actualName !== properName) {
					context.report({
						node: root.id,
						message: `Expected "${actualName}" to be "${properName}".`,
					})
				}
			}
		}
	},
	tests: {
		valid: [
			'var something = require("shawn-mendes")',
			'var JamesArthur = require("./james-arthur")',
			{
				code: 'var JamesArthur = require("./james-arthur")',
				filename: './rules/use-require-name-after-file-path.js',
				options: [['./rules/*.js']],
			},
			{
				code: 'var something = require("./james-arthur")',
				filename: './rules/use-require-name-after-file-path.js',
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
				filename: './rules/require-name-after-file-name.js',
				options: [['./rules/*.js']],
				errors: [{ message: 'Expected "something" to be "JamesArthur".', }]
			},
		]
	}
}
