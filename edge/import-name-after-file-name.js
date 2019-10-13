'use strict'

const fp = require('path')
const _ = require('lodash')
const { getImportFullPath } = require('./import-path-from-closest-index')

const ALPHANUMERIC = /[A-Za-z0-9]/

module.exports = {
	meta: {
		docs: {
			description: 'enforce naming an imported identifier after file or directory name, for example `import MyComponent from "./MyComponent"`',
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
				const fileNameWithoutExtension = fp.basename(fullPath, fp.extname(fullPath))
				const directoryName = fp.basename(fp.dirname(fullPath))
				const expectedName = fileNameWithoutExtension === 'index'
					? _.get(directoryName.match(ALPHANUMERIC), '0', '').toUpperCase() + _.camelCase(directoryName).substring(1)
					: _.get(fileNameWithoutExtension.match(ALPHANUMERIC), '0', '') + _.camelCase(fileNameWithoutExtension).substring(1)

				// Check for another duplicate identifier
				const otherImports = _.last(context.getAncestors()).body.filter(node => node.type === 'ImportDeclaration' && node !== root)
				if (otherImports.some(node => node.specifiers && node.specifiers.some(spec => spec.local.name === expectedName))) {
					return null
				}

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
				errors: [{ message: 'Expected "XXX" to be "aaa".' }],
			},
			{
				code: `import * as XXX from '../xxx-yyy/index'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected "XXX" to be "XxxYyy".' }],
			},
		]
	}
}
