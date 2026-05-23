// @ts-check

import { defineRule } from '@oxlint/plugins'
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

export default defineRule({
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
	createOnce(context) {
		return {
			TSEnumDeclaration(root) {
				if (typeof context.options[0] !== 'string' || !(context.options[0] in STYLES)) {
					return
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
})
