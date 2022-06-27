const fp = require('path')
const _ = require('lodash')

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce exporting the default with the same file name',
		},
	},
	create: function (context) {
		return {
			ExportNamedDeclaration: function (root) {
				if (
					!root.source ||
					root.source.type !== 'Literal' ||
					!root.source.value.startsWith('.') ||
					!root.specifiers ||
					root.specifiers.length === 0
				) {
					return
				}

				const defaultNode = root.specifiers.find(node => _.isMatch(node, EXPORT_DEFAULT))
				if (!defaultNode) {
					return
				}

				const expectedName = fp.basename(root.source.value).replace(/\..*/, '')
				if (expectedName !== _.words(expectedName).join('')) {
					return
				}

				const defaultName = defaultNode.exported.name
				if (defaultName !== expectedName) {
					context.report({
						node: defaultNode,
						message: `Expected the default export name ${defaultName} to be after its file name ${expectedName}`,
					})
				}
			},
		}
	},
	tests: {
		valid: [
			{
				code: `export { default as MyComponent } from './MyComponent.react'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `export { default as SomethingElse } from './My-Component.react'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `export { SomethingElse } from './MyComponent.react'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `export * from './MyComponent.react'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `export { default as Component } from './MyComponent.react'`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the default export name Component to be after its file name MyComponent' }],
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
