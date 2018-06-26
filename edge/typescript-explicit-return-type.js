module.exports = {
	meta: {
		docs: {
			description: 'enforce writing an explicit return type for exported functions',
			category: 'Possible Errors',
		},
	},
	create: function (context) {
		const untypedFunctionHash = {}
		return {
			ExportNamedDeclaration: function (root) {
				if (root.declaration.type === 'FunctionDeclaration' && !root.declaration.returnType) {
					context.report({
						node: root.declaration,
						message: `Expected an exported function must have a return type.`,
					})
				}

				if (root.declaration.type === 'VariableDeclaration' && root.declaration.declarations) {
					for (const node of root.declaration.declarations) {
						if (node.type === 'VariableDeclarator' && node.init && node.init.type === 'ArrowFunctionExpression' && !node.init.returnType) {
							context.report({
								node: node.init,
								message: `Expected an exported function must have a return type.`,
							})
						}
					}
				}
			},
			FunctionDeclaration: function (root) {
				if (root.id && root.id.type === 'Identifier' && !root.returnType) {
					untypedFunctionHash[root.id.name] = root
				}
			},
			VariableDeclarator: function (root) {
				if (root.id && root.id.type === 'Identifier' && root.init && (root.init.type === 'FunctionExpression' || root.init.type === 'ArrowFunctionExpression') && !root.init.returnType) {
					untypedFunctionHash[root.id.name] = root.init
				}
			},
			ExportDefaultDeclaration: function (root) {
				if (root.declaration && root.declaration.type === 'Identifier' && untypedFunctionHash[root.declaration.name]) {
					context.report({
						node: untypedFunctionHash[root.declaration.name],
						message: `Expected an exported function must have a return type.`,
					})
				}
			},
		}
	},
	test: {
		valid: [
			{
				code: `
					export function x(): string {}
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					export const x = (): string => {}
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x = function(): string {}
					export default x
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const x = (): string => {}
					export default x
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `
					export function x() {}
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					export const x = () => {}
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					const x = function() {}
					export default x
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
			{
				code: `
					const x = () => {}
					export default x
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an exported function must have a return type.' }],
			},
		],
	},
}
