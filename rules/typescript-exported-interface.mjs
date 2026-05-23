// @ts-check

import { defineRule } from '@oxlint/plugins'

export default defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce exporting an `interface`, unless it is inside a `declare` block',
		},
	},
	createOnce(context) {
		return {
			TSInterfaceDeclaration(root) {
				if (root.parent?.type === 'ExportNamedDeclaration') {
					return
				}

				if (context.sourceCode.getAncestors(root).some(node => 'type' in node && node.type === 'TSModuleDeclaration')) {
					return
				}

				context.report({
					node: root,
					message: `Expected interfaces to be exported.`,
				})
			},
		}
	},
})
