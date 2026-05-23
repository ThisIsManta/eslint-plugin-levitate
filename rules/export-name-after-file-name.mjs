// @ts-check

import { defineRule } from '@oxlint/plugins'
import fp from 'path'
import _ from 'lodash'

export default defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming a default exported identifier after the file name',
		},
	},
	createOnce(context) {
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

				const defaultNode = root.specifiers.find(node =>
					node.local.type === 'Identifier' &&
					node.local.name === 'default'
				)
				if (!defaultNode) {
					return
				}

				if (defaultNode.exported.type !== 'Identifier') {
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
})
