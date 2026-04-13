// @ts-check

import _ from 'lodash'

const focusedAPI = /^(it|test|describe|(after|before)(All|Each))$/

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce having a new line between `it`, `test`, `describe` and before `expect` function calls; this applies to _*.{test,spec}_ files only',
		},
		fixable: 'code',
	},
	create(context) {
		return {
			Program: check,
			BlockStatement: check,
		}

		/**
		 * @param {import('estree').Program | import('estree').BlockStatement} root
		 */
		function check(root) {
			const nodeList = root.body.map(
				/**
				 * @param {import('estree').ModuleDeclaration | import('estree').Statement | import('estree').Directive} node
				 * @param {number} rank
				 */
				(node, rank) => ({
					node,
					rank,
					name: node.type === 'ExpressionStatement' && getLeftMostIdentifier(node.expression) || ''
				})
			)

			for (const { node, rank, name } of nodeList) {
				const prev = nodeList[rank - 1]
				const next = nodeList[rank + 1]
				const aboveBlankLineCount = prev && node.loc && prev.node.loc ? (node.loc.start.line - prev.node.loc.end.line - 1) : NaN
				const belowBlankLineCount = next && node.loc && next.node.loc ? (next.node.loc.start.line - node.loc.end.line - 1) : NaN

				if (focusedAPI.test(name)) {
					if (aboveBlankLineCount <= 0) {
						const loc = context.sourceCode.getFirstToken(node)?.loc
						if (loc) {
							context.report({
								loc,
								message: 'Expected a blank line before this statement',
								fix: fixer => fixer.insertTextAfter(prev.node, '\n')
							})
						}
					}

					if (belowBlankLineCount <= 0 && !focusedAPI.test(next.name)) {
						const loc = context.sourceCode.getLastToken(node)?.loc
						if (loc) {
							context.report({
								loc,
								message: 'Expected a blank line after this statement',
								fix: fixer => fixer.insertTextAfter(node, '\n')
							})
						}
					}
				}

				if (name == 'expect') {
					if (aboveBlankLineCount <= 0 && prev.name !== 'expect') {
						const loc = context.sourceCode.getFirstToken(node)?.loc
						if (loc) {
							context.report({
								loc,
								message: 'Expected a blank line before this statement',
								fix: fixer => fixer.insertTextAfter(prev.node, '\n')
							})
						}
					} else if (aboveBlankLineCount >= 1 && prev.name === 'expect' && !context.sourceCode.commentsExistBetween(prev.node, node)) {
						const loc = context.sourceCode.getFirstToken(node)?.loc
						if (loc && prev.node.range && node.range) {
							/**
							 * @type {[number, number]}
							 */
							const range = [prev.node.range[1], node.range[0]]

							context.report({
								loc,
								message: 'Expected no blank line between `expect` statements',
								fix: fixer => {
									// Preserve the existing indentations
									const replacement = _.get(context.sourceCode.getText().substring(range[0], range[1]).match(/\n(.*)$/), '0', '\n')
									return fixer.replaceTextRange(range, replacement)
								}
							})
						}
					}

					if (belowBlankLineCount <= 0 && next.name !== 'expect') {
						const loc = context.sourceCode.getLastToken(node)?.loc
						if (loc) {
							context.report({
								loc,
								message: 'Expected a blank line after this statement',
								fix: fixer => fixer.insertTextAfter(node, '\n')
							})
						}
					}
				}
			}
		}
	}
}

/**
 * @param {import('estree').Node} root
 * @return {string | null}
 */
function getLeftMostIdentifier(root) {
	if (!root) {
		return null
	}

	if (root.type === 'Identifier') {
		return root.name
	}

	if (root.type === 'CallExpression') {
		return getLeftMostIdentifier(root.callee)
	}

	if (root.type === 'MemberExpression') {
		return getLeftMostIdentifier(root.object)
	}

	if (root.type === 'AwaitExpression') {
		return getLeftMostIdentifier(root.argument)
	}

	return null
}
