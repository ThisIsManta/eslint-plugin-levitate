// @ts-check

const fp = require('path')
const _ = require('lodash')

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming a default exported identifier after the file name',
		},
	},
	create: function (context) {
		return {
			ExportNamedDeclaration: function (root) {
				if (
					!root.source ||
					root.source.type !== 'Literal' ||
					typeof root.source.value !== 'string' ||
					root.source.value.startsWith('.') === false
				) {
					return
				}

				const defaultNode = root.specifiers.find(node => _.isMatch(node, EXPORT_DEFAULT))
				if (!defaultNode) {
					return
				}

				const defaultName = defaultNode.exported.name
				if (defaultName === 'default') {
					return
				}

				const expectedName = fp.basename(root.source.value).replace(/\..*/, '')
				if (expectedName !== _.words(expectedName).join('')) {
					return
				}

				if (defaultName !== expectedName) {
					context.report({
						node: defaultNode,
						message: `Expected the default export name "${defaultName}" to be after its file name "${expectedName}"`,
					})
				}
			},
		}
	},
	tests: process.env.TEST && {
		valid: [
			{
				code: `export { default as MyComponent } from './MyComponent.react'`,
			},
			{
				code: `export { default as SomethingElse } from './My-Component.react'`,
			},
			{
				code: `export { SomethingElse } from './MyComponent.react'`,
			},
			{
				code: `export * from './MyComponent.react'`,
			},
		],
		invalid: [
			{
				code: `export { default as Component } from './MyComponent.react'`,
				errors: [{ message: 'Expected the default export name "Component" to be after its file name "MyComponent"' }],
			},
		]
	}
}

const EXPORT_DEFAULT = {
	type: 'ExportSpecifier',
	local: {
		type: 'Identifier',
		name: 'default',
	},
	exported: {
		type: 'Identifier',
	},
}
