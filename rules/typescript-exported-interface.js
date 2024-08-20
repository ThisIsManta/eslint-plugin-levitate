// @ts-check

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce exporting an `interface`, unless it is inside a `declare` block',
		},
	},
	create: function (context) {
		return {
			TSInterfaceDeclaration: function (root) {
				if (!root.parent || root.parent.type !== 'ExportNamedDeclaration') {
					if (context.sourceCode.getAncestors(root).some(node => String(node.type) === 'TSModuleDeclaration')) {
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
	tests: process.env.TEST && {
		valid: [
			{
				code: `export interface x {}`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `declare global { interface x {} }`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
		],
		invalid: [
			{
				code: `interface x {}`,
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected interfaces to be exported.' }],
			},
		],
	},
}
