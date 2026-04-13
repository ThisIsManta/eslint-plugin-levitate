// @ts-check

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce exporting an `interface`, unless it is inside a `declare` block',
		},
	},
	create(context) {
		return {
			TSInterfaceDeclaration(root) {
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
}
