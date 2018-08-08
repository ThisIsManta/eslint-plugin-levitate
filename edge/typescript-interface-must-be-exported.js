module.exports = {
	meta: {
		docs: {
			description: 'enforce exporting interfaces',
			category: 'Stylistic Issues',
		},
	},
	create: function (context) {
		return {
			TSInterfaceDeclaration: function (root) {
				if (!root.parent || root.parent.type !== 'ExportNamedDeclaration') {
					return context.report({
						node: root,
						message: `Expected interfaces to be exported.`,
					})
				}
			},
		}
	},
	test: {
		valid: [
			{
				code: `export interface x {}`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `interface x {}`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected interfaces to be exported.' }],
			},
		],
	},
}
