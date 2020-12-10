const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce naming user-defined interfaces starting with "I"',
			category: 'Stylistic Issues',
		},
	},
	create: function (context) {
		return {
			TSInterfaceDeclaration: function (root) {
				if (/^I[A-Z]/.test(root.id.name)) {
					return
				}

				for (const node of context.getAncestors()) {
					if (node.type === 'TSModuleDeclaration') {
						return
					}
				}

				context.report({
					node: root.id,
					message: `Expected the interface to start with "I"`,
				})
			}
		}
	},
	tests: {
		valid: [
			{
				code: `interface IWindow {}`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `declare global { interface Window {} }`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `interface Window {}`,
				options: ['PascalCase'],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the interface to start with "I"' }],
			},
		]
	}
}
