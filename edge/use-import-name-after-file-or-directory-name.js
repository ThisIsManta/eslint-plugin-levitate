'use strict'

const pt = require('path')
const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing variable name after the user-defined list',
			category: 'Variables',
		},
	},
	create: function (context) {
		return {
			ImportDeclaration: function (root) {
				if (!root.specifiers || root.specifiers.length === 0) {
					return null
				}

				const workNode = root.specifiers.find(node => node.type === 'ImportNamespaceSpecifier' || node.type === 'ImportDefaultSpecifier')
				if (workNode === undefined) {
					return null
				}

				const workPath = root.source.value
				const fileName = pt.basename(workPath, pt.extname(workPath))
				const dirxName = pt.dirname(workPath)

				const camelName = _.camelCase(fileName === 'index' ? dirxName : fileName)
				const pascalName = camelName.charAt(0).toUpperCase() + camelName.substring(1)
				if (workNode.local.name !== pascalName) {
					return context.report({
						node: workNode.local,
						message: `Expected "${workNode.local.name}" to be "${pascalName}".`,
					})
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `import { a } from 'aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import * as Aaa from 'aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import Aaa from 'aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import Aaa from 'aaa.js'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import Aaa from './aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import Aaa from '../xxx-yyy/aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import XxxYyy from '../xxx-yyy/index'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `import XXX from 'aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "XXX" to be "Aaa".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected "XXX" to be "Aaa".' }
				],
			},
		]
	}
}
