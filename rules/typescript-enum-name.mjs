// @ts-check

import _ from 'lodash'

/**
 * @type {Record<string, (input: string) => string>}
 */
const STYLES = {
	PascalCase(input) {
		return _.upperFirst(_.camelCase(input))
	},
	camelCase(input) {
		return _.camelCase(input)
	},
	UPPERCASE(input) {
		return _.words(input).join('').toUpperCase()
	},
	SNAKE_CASE(input) {
		return _.snakeCase(input).toUpperCase()
	}
}

const options = Object.keys(STYLES)
const defaultOption = options[0]

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
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
	create(context) {
		return {
			/**
			 * @param {import('@typescript-eslint/types').TSESTree.TSEnumDeclaration} root
			 */
			TSEnumDeclaration(root) {
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
}
