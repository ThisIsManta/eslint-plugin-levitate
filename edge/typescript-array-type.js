module.exports = {
	meta: {
		docs: {
			description: 'enforce writing either a generic array type or the square bracket notation',
			category: 'Stylistic Issues',
		},
		schema: [
			{
				enum: ['generic', 'bracket'],
				default: 'bracket',
			}
		],
		fixable: 'code'
	},
	create: function (context) {
		const sourceCode = context.getSourceCode()

		return {
			TSArrayType: function (root) {
				if (context.options[0] === 'generic') {
					return context.report({
						node: root,
						message: `Expected an array type must be written in the square bracket notation.`,
						fix: fixer => fixer.replaceText(root, `Array<${sourceCode.getText(root.elementType)}>`)
					})
				}
			},
			TSTypeReference: function (root) {
				if (
					context.options[0] === 'bracket' &&
					root.typeName && root.typeName.type === 'Identifier' && root.typeName.name === 'Array' &&
					root.typeParameters && root.typeParameters.type === 'TSTypeParameterInstantiation' && root.typeParameters.params.length === 1
				) {
					const innerTypeNotation = root.typeParameters.params[0]
					let innerTypeText = sourceCode.getText(innerTypeNotation)
					if (innerTypeNotation.type === 'TSTypeReference' && innerTypeText.startsWith('(') === false) {
						innerTypeText = '(' + innerTypeText + ')'
					}
					return context.report({
						node: root,
						message: `Expected an array type must be written in a generic type.`,
						fix: fixer => fixer.replaceText(root, `${innerTypeText}[]`)
					})
				}
			},
		}
	},
	test: {
		valid: [
			{
				code: `type x = any`,
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `type x = Array<any>`,
				options: ['generic'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `type x = Array<Array<any>>`,
				options: ['generic'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `type x = Promise<any>`,
				options: ['generic'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `type x = any[]`,
				options: ['bracket'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `type x = any[]`,
				options: ['generic'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an array type must be written in the square bracket notation.' }],
				output: `type x = Array<any>`,
			},
			{
				code: `type x = Array<any>`,
				options: ['bracket'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an array type must be written in a generic type.' }],
				output: `type x = any[]`,
			},
			{
				code: `type x = Array<number | string>`,
				options: ['bracket'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an array type must be written in a generic type.' }],
				output: `type x = (number | string)[]`,
			},
			{
				code: `type x = Array<(number | string)>`,
				options: ['bracket'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an array type must be written in a generic type.' }],
				output: `type x = (number | string)[]`,
			},
		],
	},
}
