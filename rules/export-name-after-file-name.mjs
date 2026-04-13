// @ts-check

import fp from 'path'
import _ from 'lodash'

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming a default exported identifier after the file name',
		},
	},
	create(context) {
		return {
			ExportNamedDeclaration(root) {
				if (
					!root.source ||
					root.source.type !== 'Literal' ||
					typeof root.source.value !== 'string' ||
					root.source.value.startsWith('.') === false
				) {
					return
				}

				const defaultNode = root.specifiers.find(node => _.isMatch(node, EXPORT_DEFAULT))
				if (!defaultNode) {
					return
				}

				const defaultName = defaultNode.exported.name
				if (defaultName === 'default') {
					return
				}

				const expectedName = fp.basename(root.source.value).replace(/\..*/, '')
				if (expectedName !== _.words(expectedName).join('')) {
					return
				}

				if (defaultName !== expectedName) {
					context.report({
						node: defaultNode,
						message: `Expected the default export name "${defaultName}" to be after its file name "${expectedName}"`,
					})
				}
			},
		}
	}
}

const EXPORT_DEFAULT = {
	type: 'ExportSpecifier',
	local: {
		type: 'Identifier',
		name: 'default',
	},
	exported: {
		type: 'Identifier',
	},
}
