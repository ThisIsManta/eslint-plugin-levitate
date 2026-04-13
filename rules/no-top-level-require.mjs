// @ts-check

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing no top-level `require`',
		},
	},
	create(context) {
		return {
			CallExpression(root) {
				if (root.callee.type !== 'Identifier' || root.callee.name !== 'require' || root.arguments.length < 1 || root.arguments[0].type !== 'Literal') {
					return
				}

				for (const node of context.sourceCode.getAncestors(root).reverse()) {
					if (
						node.type === 'BlockStatement' ||
						node.type === 'ArrowFunctionExpression' ||
						node.type === 'ClassBody' ||
						node.type === 'TemplateLiteral'
					) {
						return
					}
				}

				context.report({
					node: root,
					message: 'Expected `require` to be `import` syntax',
				})
			},
		}
	}
}
