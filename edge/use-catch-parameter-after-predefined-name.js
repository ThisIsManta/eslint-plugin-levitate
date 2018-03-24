module.exports = {
	meta: {
		docs: {
			description: 'enforce ',
			category: 'ECMAScript 6',
		},
		schema: [
			{ type: 'string' }
		],
	},
	create: function (context) {
		return {
			CatchClause: function (rootNode) {
				if (!context.options || !context.options[0]) {
					return null
				}

				if (rootNode.param.type === 'Identifier' && rootNode.param.name !== context.options[0]) {
					return context.report({
						node: rootNode.param,
						message: `Expected catch-parameter to be named "${context.options[0]}".`,
					})
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `try {} catch (e) {}`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `try {} catch (error) {}`,
				options: ['error'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `try {} catch (e) {}`,
				options: ['error'],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected catch-parameter to be named "error".' }],
			},
		]
	}
}
