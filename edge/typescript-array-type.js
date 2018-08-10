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
					const innerType = root.elementType
					let innerText = sourceCode.getText(innerType).trim()
					if (innerType.type === 'TSParenthesizedType' && innerText.startsWith('(') && innerText.endsWith(')')) {
						innerText = innerText.substring(1, innerText.length - 1)
					}
					return context.report({
						node: root,
						message: `Expected an array type must be written in the square bracket notation.`,
						fix: fixer => fixer.replaceText(root, `Array<${innerText}>`)
					})
				}
			},
			TSTypeReference: function (root) {
				if (
					context.options[0] === 'bracket' &&
					root.typeName && root.typeName.type === 'Identifier' && root.typeName.name === 'Array' &&
					root.typeParameters && root.typeParameters.type === 'TSTypeParameterInstantiation' && root.typeParameters.params.length === 1
				) {
					const innerType = root.typeParameters.params[0]
					let innerText = sourceCode.getText(innerType).trim()
					if (
						innerType.type === 'TSTypeReference' &&
						(innerType.typeName.type === 'TSUnionType' || innerType.typeName.type === 'TSIntersectionType')
					) {
						innerText = '(' + innerText + ')'
					}

					return context.report({
						node: root,
						message: `Expected an array type must be written in a generic type.`,
						fix: fixer => fixer.replaceText(root, `${innerText}[]`)
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
				code: `type x = (number | string)[]`,
				options: ['generic'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an array type must be written in the square bracket notation.' }],
				output: `type x = Array<number | string>`,
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
				code: `type x = Array<IType>`,
				options: ['bracket'],
				parser: 'typescript-eslint-parser',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected an array type must be written in a generic type.' }],
				output: `type x = IType[]`,
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
