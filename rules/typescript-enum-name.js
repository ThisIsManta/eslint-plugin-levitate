/// <reference path="../types.d.ts" />
// @ts-check

const _ = require('lodash')

const STYLES = {
	PascalCase: function (input) {
		return _.upperFirst(_.camelCase(input))
	},
	camelCase: function (input) {
		return _.camelCase(input)
	},
	UPPERCASE: function(input) {
		return _.words(input).join('').toUpperCase()
	},
	SNAKE_CASE: function(input) {
		return _.snakeCase(input).toUpperCase()
	}
}

const options = Object.keys(STYLES)
const defaultOption = options[0]

/**
 * @type {Rule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming enumerations consistently; the possible options are ' + options.map(option => '`"' + option + '"`' + (option === defaultOption ? ' (default)' : '')).join(', '),
		},
		schema: [
			{
				enum: options,
				default: defaultOption
			}
		],
	},
	create: function (context) {
		return {
			/**
			 * @param {TS.TSEnumDeclaration} root
			 */
			TSEnumDeclaration: function (root) {
				if (!context.options || !STYLES[context.options[0]]) {
					return null
				}

				const expectedName = STYLES[context.options[0]](root.id.name)
				if (root.id.name !== expectedName) {
					context.report({
						node: root.id,
						message: `Expected the enumeration to be named "${expectedName}".`,
					})
				}
			}
		}
	},
	tests: {
		valid: [
			{
				code: `enum PascalCase {}`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `enum PascalCase {}`,
				options: ['PascalCase'],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `enum camelCase {}`,
				options: ['camelCase'],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `enum SNAKE_CASE {}`,
				options: ['SNAKE_CASE'],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `enum SNAKE_CASE {}`,
				options: ['PascalCase'],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the enumeration to be named "SnakeCase".' }],
			},
		]
	}
}
