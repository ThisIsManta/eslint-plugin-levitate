module.exports = {
	meta: {
		docs: {
			description: 'enforce writing an interface name starting with a capital I',
			category: 'Stylistic Issues',
		},
	},
	create: function (context) {
		return {
			TSInterfaceDeclaration: function (root) {
				if (root.id && root.id.type === 'Identifier' && /^I[A-Z]/.test(root.id.name) === false) {
					const nodes = context.getAncestors().reverse()
					for (const node of nodes) {
						if (node.type === 'TSModuleDeclaration' && node.id && node.id.type === 'Identifier' && node.id.name === 'global') {
							return null
						}
					}

					context.report({
						node: root.id,
						message: `Expected an interface name must start with a capital I.`,
					})
				}
			},
		}
	},
	test: {
		valid: [
			{
				code: `
					interface IName {}
				`,
				parser: '@typescript-eslint/parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					declare global {
						interface Window {}
					}
				`,
				parser: '@typescript-eslint/parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `
					interface Inter {}
				`,
				parser: '@typescript-eslint/parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an interface name must start with a capital I.' }],
			},
		],
	},
}
