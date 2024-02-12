/// <reference path="../types.d.ts" />
// @ts-check

/**
 * @type {RuleModule}
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
			/**
			 * @param {WithParent<ES.Node>} root
			 */
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
	tests: {
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
