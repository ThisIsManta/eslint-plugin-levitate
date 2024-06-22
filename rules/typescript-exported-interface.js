/// <reference path="../types.d.ts" />
// @ts-check

/**
 * @type {Rule}
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
				languageOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: `declare global { interface x {} }`,
				languageOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					parser: require('@typescript-eslint/parser'),
				},
			},
		],
		invalid: [
			{
				code: `interface x {}`,
				languageOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					parser: require('@typescript-eslint/parser'),
				},
				errors: [{ message: 'Expected interfaces to be exported.' }],
			},
		],
	},
}
