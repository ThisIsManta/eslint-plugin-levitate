// @ts-check

import _ from 'lodash'

const DEFAULT_PROPS_ORDER = [
	'key',
	'ref',
	'id',
	'className',
	'*ClassName',
	'*',
	'children',
	'on*',
	'data-*',
]

/**
 * @template {import('@typescript-eslint/types').TSESTree.Node} T
 * @typedef {T & { parent: T }} WithParent<T>
 */

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'layout',
		docs: {
			description: 'enforce consistent React props sorting',
		},
		schema: [
			{
				type: 'array',
				items: {
					type: 'string',
				}
			}
		],
		fixable: 'code',
	},
	create(context) {
		/**
		 * @type {Array<RegExp | null>}
		 */
		const matchers = (context.options[0] || DEFAULT_PROPS_ORDER).map(pattern =>
			pattern === '*' ? null : new RegExp('^' + pattern.replace(/\*/g, '.+') + '$')
		)

		const wholeFileText = context.sourceCode.getText()

		const propTypeAnnotatedNodes = new Set()

		return {
			/**
			 * @param {WithParent<import('@typescript-eslint/types').TSESTree.TSTypeLiteral>} root
			 */
			TSTypeLiteral(root) { // Match `type Props = { ... }` and `function (props: { ... })`
				if (!findPropTypeDeclaration(root.parent)) {
					return
				}

				for (const props of getPropSegments(root.members)) {
					check(props)
				}
			},
			/**
			 * @param {import('@typescript-eslint/types').TSESTree.JSXOpeningElement} root
			 */
			JSXOpeningElement(root) {
				for (const props of getPropSegments(root.attributes)) {
					check(props)
				}
			},
			ImportDeclaration(root) {
				if (
					root.source.type !== 'Literal' ||
					root.source.value !== 'react'
				) {
					return
				}

				/**
				 * @param {import('@typescript-eslint/types').TSESTree.Node | undefined} node
				 * @return {import('@typescript-eslint/types').TSESTree.Node | null}
				 */
				function findDeclarativeNode(node) {
					if (!node) {
						return null
					}

					if (node.type === 'TSAsExpression') {
						return node
					}

					if (node.type === 'TSTypeAnnotation') {
						if (
							'typeAnnotation' in node.parent &&
							node.parent.typeAnnotation === node && (
								node.parent.parent.type === 'VariableDeclarator' ||
								node.parent.parent.type === 'AssignmentPattern' && node.parent.parent.left === node.parent
							)
						) {
							return node.parent.parent
						}

						if (
							(
								node.parent.type === 'ArrowFunctionExpression' ||
								node.parent.type === 'FunctionDeclaration' ||
								node.parent.type === 'FunctionExpression'
							) &&
							node.parent.returnType === node
						) {
							return node.parent
						}

						return null
					}

					return findDeclarativeNode(node.parent)
				}

				const defaultImportNode = root.specifiers.find(node => node.type === 'ImportDefaultSpecifier')
				if (defaultImportNode) {
					const [{ references }] = context.sourceCode.getDeclaredVariables(defaultImportNode)
					const nodes = _.chain(references)
						.filter(({ identifier }) =>
							_.isMatch(identifier, {
								parent: {
									type: 'TSQualifiedName',
									left: _.pick(identifier, ['type', 'name']),
									right: { type: 'Identifier', name: 'ComponentProps' },
									parent: { type: 'TSTypeReference' }
								}
							})
						)
						.map((reference) => {
							const identifier = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (reference.identifier)
							return findDeclarativeNode(identifier.parent?.parent?.parent)
						})
						.compact()
						.value()

					for (const node of nodes) {
						propTypeAnnotatedNodes.add(node)
					}
				}

				const componentTypeNode = root.specifiers.find(node => _.isMatch(node, { type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'ComponentProps' } }))
				if (componentTypeNode) {
					const [{ references }] = context.sourceCode.getDeclaredVariables(componentTypeNode)
					const nodes = _.chain(references)
						.filter(({ identifier }) =>
							_.isMatch(identifier, {
								parent: {
									type: 'TSTypeReference',
									typeName: _.pick(identifier, ['type', 'name']),
								}
							})
						)
						.map((reference) => {
							const identifier = /** @type {WithParent<import('@typescript-eslint/types').TSESTree.Identifier>} */ (reference.identifier)
							return findDeclarativeNode(identifier.parent.parent)
						})
						.compact()
						.value()

					for (const node of nodes) {
						propTypeAnnotatedNodes.add(node)
					}
				}
			},

			/**
			 * @param {WithParent<import('@typescript-eslint/types').TSESTree.ObjectExpression>} root
			 */
			ObjectExpression(root) {
				/**
				 * @param {import('@typescript-eslint/types').TSESTree.Node | undefined} node
				 */
				function findDeclarativeNode(node) {
					if (!node) {
						return null
					}

					if (node.type === 'Property') {
						return null
					}

					if (node.type === 'TSAsExpression') {
						return node
					}

					if (node.type === 'VariableDeclarator' || node.type === 'AssignmentPattern') {
						return node
					}

					if (node.type === 'BlockStatement') {
						return null
					}

					if (node.type === 'ArrowFunctionExpression') {
						return node
					}

					if (
						node.type === 'ReturnStatement' &&
						node.parent.type === 'BlockStatement' &&
						(
							node.parent.parent.type === 'ArrowFunctionExpression' ||
							node.parent.parent.type === 'FunctionDeclaration' ||
							node.parent.parent.type === 'FunctionExpression'
						)
					) {
						return node.parent.parent
					}

					return findDeclarativeNode(node.parent)
				}

				const node = findDeclarativeNode(root)
				if (node && propTypeAnnotatedNodes.has(node)) {
					for (const props of getPropSegments(root.properties)) {
						check(props)
					}
				}
			},
		}

		/**
		 * @param {string} name
		 * @return {number}
		 */
		function findIndex(name) {
			let starIndex = matchers.indexOf(null)
			if (starIndex === -1) {
				starIndex = Infinity
			}

			let matchingIndex = -1
			for (let index = 0; index < matchers.length; index++) {
				if (matchers[index]?.test(name)) {
					matchingIndex = index
					break
				}
			}

			return matchingIndex >= 0 ? matchingIndex : starIndex
		}

		/**
		 * @param {Record<string, import('@typescript-eslint/types').TSESTree.Node>} props
		 */
		function check(props) {
			const originalNames = _.keys(props)

			if (originalNames.length === 0) {
				return
			}

			const sortedNames = _.sortBy(originalNames, findIndex)

			const takenComments = new Set()
			const surroundingCommentMap = new Map()
			for (const node of _.values(props)) {
				const aboveComments = context.sourceCode.getCommentsBefore(/** @type {import('estree').Node} */(node))
					.filter(comment => !takenComments.has(comment))
				for (const comment of aboveComments) {
					takenComments.add(comment)
				}

				const rightComment = context.sourceCode.getCommentsAfter(/** @type {import('estree').Node} */(node)).find(comment =>
					comment.type === 'Line' &&
					comment.loc?.start.line === node.loc.end.line
				)
				if (rightComment) {
					takenComments.add(rightComment)
				}

				surroundingCommentMap.set(node, { aboveComments, rightComment })
			}

			/**
			 * @param {import('@typescript-eslint/types').TSESTree.Node} node
			 * @return {import('@typescript-eslint/types').TSESTree.Range}
			 */
			function getNodeRangeWithComments(node) {
				const { aboveComments, rightComment } = surroundingCommentMap.get(node)

				return [
					aboveComments.length > 0 ? aboveComments[0].range[0] : node.range[0],
					rightComment ? rightComment.range[1] : node.range[1]
				]
			}

			for (let index = 0; index < originalNames.length; index++) {
				if (originalNames[index] !== sortedNames[index]) {
					const foundNode = props[originalNames[index]]
					const expectedName = sortedNames[index]

					context.report({
						loc: foundNode.loc,
						message: `Expected the prop \`${expectedName}\` to be sorted here`,
						fix: fixer => _.chain(props)
							.values()
							.map((originalNode, index) => {
								if (originalNames[index] === sortedNames[index]) {
									return null
								}

								const expandedOriginalRange = getNodeRangeWithComments(originalNode)
								const [originalSeparator] = context.sourceCode.getText(/** @type {import('estree').Node} */(originalNode)).match(/[;,]$/) || ['']

								const replacementNode = props[sortedNames[index]]
								const expandedReplacementRange = getNodeRangeWithComments(replacementNode)
								const replacementText =
									wholeFileText.substring(expandedReplacementRange[0], replacementNode.range[0]) +
									context.sourceCode.getText(/** @type {import('estree').Node} */(replacementNode)).replace(/[;,]$/, '') + originalSeparator +
									wholeFileText.substring(replacementNode.range[1], expandedReplacementRange[1])

								return fixer.replaceTextRange(expandedOriginalRange, replacementText)
							})
							.compact()
							.reverse()
							.value()
					})

					return
				}
			}
		}
	}
}

/**
 * @param {import('@typescript-eslint/types').TSESTree.Node | undefined} node
 */
function findPropTypeDeclaration(node) {
	if (
		!node ||
		String(node.type) === 'Program' ||
		node.type === 'ArrowFunctionExpression' ||
		node.type === 'FunctionDeclaration' ||
		node.type === 'FunctionExpression'
	) {
		return null
	}

	if (
		node.type === 'TSTypeAliasDeclaration' &&
		node.id?.type === 'Identifier' &&
		node.id.name.endsWith('Props')
	) {
		return node
	}

	if (
		node.type === 'TSTypeAnnotation' &&
		node.parent.type === 'Identifier' &&
		node.parent.name === 'props'
	) {
		return node
	}

	return findPropTypeDeclaration(node.parent)
}

/**
 * @param {Array<import('@typescript-eslint/types').TSESTree.TypeElement | import('@typescript-eslint/types').TSESTree.ObjectLiteralElement | import('@typescript-eslint/types').TSESTree.JSXAttribute | import('@typescript-eslint/types').TSESTree.JSXSpreadAttribute>} properties
 */
function getPropSegments(properties) {
	return properties.reduce((groups, node) => {
		const name = (/** @return {string | undefined} */ () => {
			if (node.type === 'JSXAttribute' && node.name.type === 'JSXIdentifier') {
				return node.name.name
			}
			if (node.type === 'TSPropertySignature' && node.key.type === 'Identifier') {
				return node.key.name
			}
			if (node.type === 'Property' && node.key.type === 'Identifier') {
				return node.key.name
			}
		})()

		if (name) {
			if (groups.length === 0) {
				groups.push({ [name]: node })
			} else {
				groups[groups.length - 1][name] = node
			}
		} else if (groups.length > 0) {
			// Skip processing non-literal attributes by creating a new group
			groups.push({})
		}
		return groups
	}, /** @type {Array<Record<string, import('@typescript-eslint/types').TSESTree.Node>>} */([]))
}
