// @ts-check

import { defineRule } from '@oxlint/plugins'
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

export default defineRule({
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
	createOnce(context) {
		const getMatchers = _.memoize(
			/**
			 * @param {unknown} order
			 */
			(order) => (Array.isArray(order) ? order : DEFAULT_PROPS_ORDER)
				.filter(pattern => typeof pattern === 'string')
				.map(pattern => {
					if (pattern === '*') return null
					return new RegExp('^' + pattern.replace(/\*/g, '.+') + '$')
				})
		)

		const propTypeAnnotatedNodes = new Set()

		return {
			after() {
				propTypeAnnotatedNodes.clear()
			},
			TSTypeLiteral(root) { // Match `type Props = { ... }` and `function (props: { ... })`
				if (!findPropTypeDeclaration(root.parent)) {
					return
				}

				for (const props of getPropSegments(root.members)) {
					check(props)
				}
			},
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
				 * @param {import('@oxlint/plugins').ESTree.Node | null | undefined} node
				 * @return {import('@oxlint/plugins').ESTree.Node | null}
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
							identifier.parent?.type === 'TSQualifiedName' &&
							identifier.parent.left.type === identifier.type &&
							identifier.parent.left.name === identifier.name &&
							identifier.parent.right.type === 'Identifier' &&
							identifier.parent.right.name === 'ComponentProps' &&
							identifier.parent.parent?.type === 'TSTypeReference'
						)
						.map((reference) => findDeclarativeNode(reference.identifier.parent?.parent?.parent))
						.compact()
						.value()

					for (const node of nodes) {
						propTypeAnnotatedNodes.add(node)
					}
				}

				const componentTypeNode = root.specifiers.find(node =>
					node.type === 'ImportSpecifier' &&
					node.imported.type === 'Identifier' &&
					node.imported.name === 'ComponentProps'
				)
				if (componentTypeNode) {
					const [{ references }] = context.sourceCode.getDeclaredVariables(componentTypeNode)
					const nodes = _.chain(references)
						.filter(({ identifier }) =>
							identifier.parent?.type === 'TSTypeReference' &&
							identifier.parent.typeName.type === identifier.type &&
							identifier.parent.typeName.name === identifier.name
						)
						.map((reference) => findDeclarativeNode(reference.identifier.parent.parent))
						.compact()
						.value()

					for (const node of nodes) {
						propTypeAnnotatedNodes.add(node)
					}
				}
			},
			ObjectExpression(root) {
				/**
				 * @param {import('@oxlint/plugins').ESTree.Node | null | undefined} node
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
			const matchers = getMatchers(context.options[0])

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
		 * @param {Record<string, import('@oxlint/plugins').ESTree.Node>} props
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
				const aboveComments = context.sourceCode.getCommentsBefore(node)
					.filter(comment => !takenComments.has(comment))
				for (const comment of aboveComments) {
					takenComments.add(comment)
				}

				const rightComment = context.sourceCode.getCommentsAfter(node).find(comment =>
					comment.type === 'Line' &&
					comment.loc?.start.line === node.loc.end.line
				)
				if (rightComment) {
					takenComments.add(rightComment)
				}

				surroundingCommentMap.set(node, { aboveComments, rightComment })
			}

			/**
			 * @param {import('@oxlint/plugins').ESTree.Node} node
			 * @return {import('@oxlint/plugins').Range}
			 */
			function getNodeRangeWithComments(node) {
				const { aboveComments, rightComment } = surroundingCommentMap.get(node)

				return [
					aboveComments.length > 0 ? aboveComments[0].range[0] : node.range[0],
					rightComment ? rightComment.range[1] : node.range[1]
				]
			}

			const wholeFileText = context.sourceCode.getText()

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
								const [originalSeparator] = context.sourceCode.getText(originalNode).match(/[;,]$/) || ['']

								const replacementNode = props[sortedNames[index]]
								const expandedReplacementRange = getNodeRangeWithComments(replacementNode)
								const replacementText =
									wholeFileText.substring(expandedReplacementRange[0], replacementNode.range[0]) +
									context.sourceCode.getText(replacementNode).replace(/[;,]$/, '') + originalSeparator +
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
})

/**
 * @param {import('@oxlint/plugins').ESTree.Node | null | undefined} node
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
 * @param {Array<import('@oxlint/plugins').ESTree.TSSignature | import('@oxlint/plugins').ESTree.ObjectPropertyKind | import('@oxlint/plugins').ESTree.JSXAttribute | import('@oxlint/plugins').ESTree.JSXSpreadAttribute>} properties
 */
function getPropSegments(properties) {
	return properties.reduce((/** @type {Array<Record<string, import('@oxlint/plugins').ESTree.Node>>} */ groups, node) => {
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
	}, [])
}
