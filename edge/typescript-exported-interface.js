module.exports = {
	meta: {
		docs: {
			description: 'enforce exporting an `interface`, unless it is inside a `declare` block',
			category: 'Stylistic Issues',
		},
	},
	create: function (context) {
		return {
			TSInterfaceDeclaration: function (root) {
				if (!root.parent || root.parent.type !== 'ExportNamedDeclaration') {
					if (context.getAncestors().some(node => node.type === 'TSModuleDeclaration')) {
						return
					}

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
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `declare global { interface x {} }`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `interface x {}`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected interfaces to be exported.' }],
			},
		],
	},
}
