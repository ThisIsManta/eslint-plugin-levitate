'use strict'

const pt = require('path')
const _ = require('lodash')
const { getImportFullPath } = require('./use-import-path-from-the-closest-index')

const ALPHANUMERIC = /[A-Za-z0-9]/

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing variable name after file or directory name',
			category: 'Variables',
		},
	},
	create: function (context) {
		return {
			ImportDeclaration: function (root) {
				if (!root.specifiers || root.specifiers.length === 0) {
					return null
				}

				const workPath = root.source.value
				if (workPath.startsWith('.') === false) {
					return null
				}

				const workNode = root.specifiers.find(node => node.type === 'ImportNamespaceSpecifier' || node.type === 'ImportDefaultSpecifier')
				if (workNode === undefined) {
					return null
				}

				const fullPath = getImportFullPath(context.getFilename(), workPath) || workPath
				const fileNameWithoutExtension = pt.basename(fullPath, pt.extname(fullPath))
				const directoryName = pt.basename(pt.dirname(fullPath))
				const expectedName = fileNameWithoutExtension === 'index'
					? _.get(directoryName.match(ALPHANUMERIC), '0', '').toUpperCase() + _.camelCase(directoryName).substring(1)
					: _.get(fileNameWithoutExtension.match(ALPHANUMERIC), '0', '') + _.camelCase(fileNameWithoutExtension).substring(1)
				if (workNode.local.name !== expectedName) {
					return context.report({
						node: workNode.local,
						message: `Expected "${workNode.local.name}" to be "${expectedName}".`,
					})
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `import { a } from './aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import * as aaa from './aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import aaa from './aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import aaa from './aaa.js'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import aaa from '../xxx-yyy/aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import XxxYyy from '../xxx-yyy/index'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `import XXX from './aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "XXX" to be "aaa".' }],
			},
			{
				code: `import * as XXX from './aaa'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected "XXX" to be "aaa".' }
				],
			},
			{
				code: `import * as XXX from '../xxx-yyy/index'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected "XXX" to be "XxxYyy".' }
				],
			},
		]
	}
}
