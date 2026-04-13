// @ts-check

import _ from 'lodash'

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		docs: {
			description:
				'enforce having consistent new lines between parameters',
		},
		fixable: 'whitespace',
		messages: {
			add: 'Expected a new line here.',
			remove: 'Unexpected a new line here.',
		},
	},
	create(context) {
		return {
			FunctionDeclaration: check,
			FunctionExpression: check,
			ArrowFunctionExpression: check,
			CallExpression: check,
			NewExpression: check,
		}

		/**
		 * @param {import('estree').CallExpression | import('estree').Function} root
		 */
		function check(root) {
			/** @type {Array<import('estree').Node>} */
			const params = 'arguments' in root
				? root.arguments
				: root.params
			if (params.length === 0) {
				return
			}

			const openParen = context.sourceCode.getTokenBefore(params[0])
			if (!openParen || openParen.type !== 'Punctuator' || openParen.value !== '(') {
				// Skip `param => {}`
				return
			}

			const closeParen = context.sourceCode.getTokenAfter(params[params.length - 1], { filter: token => token.type === 'Punctuator' && token.value === ')' })
			if (!closeParen) {
				return
			}

			const multilineNeeded = params.some((node, index, nodeList) => {
				const prevNode = nodeList[index - 1]
				if (prevNode && prevNode.loc?.end.line !== node.loc?.start.line) {
					return true
				}

				const prevToken = context.sourceCode.getTokenBefore(node, { includeComments: true })
				if (prevToken?.type === 'Line' || prevToken?.type === 'Block') {
					return true
				}

				const nextToken = context.sourceCode.getTokenAfter(node, { includeComments: true })
				if (nextToken?.type === 'Line' || nextToken?.type === 'Block') {
					return true
				}

				return false
			})

			if (multilineNeeded) {
				for (let index = 0; index <= params.length; index++) {
					const prevToken = index === params.length
						? context.sourceCode.getTokenBefore(closeParen)
						: context.sourceCode.getTokenBefore(params[index])
					const paramToken = index === params.length
						? closeParen
						: context.sourceCode.getFirstToken(params[index])
					if (
						!prevToken || !prevToken.loc || !prevToken.range ||
						!paramToken || !paramToken.loc || !paramToken.range
					) {
						continue
					}

					const tokens = [
						prevToken,
						...context.sourceCode.getTokensBetween(prevToken, paramToken, { includeComments: true }),
						paramToken,
					]

					for (let index = 1; index < tokens.length; index++) {
						const prevToken = tokens[index - 1]
						const nextToken = tokens[index]

						if (
							!prevToken.loc || !prevToken.range ||
							!nextToken.loc || !nextToken.range
						) {
							continue
						}

						const newLineCount = nextToken.loc.start.line - prevToken.loc.end.line
						if (newLineCount === 0) {
							const range = nextToken.range

							context.report({
								loc: { start: nextToken.loc.start, end: nextToken.loc.start },
								messageId: 'add',
								fix: (fixer) => fixer.insertTextBeforeRange(range, '\n'),
							})

						} else if (newLineCount >= 2) {
							/** @type {import('eslint').AST.Range} */
							const range = [
								prevToken.range[1],
								nextToken.range[0]
							]

							context.report({
								loc: { start: prevToken.loc.end, end: nextToken.loc.start },
								messageId: 'remove',
								fix: (fixer) => fixer.replaceTextRange(range, '\n'),
							})
						}
					}
				}

			} else {
				const firstParam = params[0]
				if (
					firstParam && firstParam.loc && firstParam.range &&
					firstParam.loc.start.line !== openParen.loc.end.line
				) {
					/** @type {import('eslint').AST.Range} */
					const range = [
						openParen.range[1],
						firstParam.range[0]
					]

					context.report({
						loc: { start: openParen.loc.end, end: firstParam.loc.start },
						messageId: 'remove',
						fix: (fixer) => fixer.removeRange(range),
					})
				}

				const prevToken = context.sourceCode.getTokenBefore(closeParen)
				if (
					prevToken && prevToken.loc && prevToken.range &&
					prevToken.loc.end.line !== closeParen.loc.start.line
				) {
					/** @type {import('eslint').AST.Range} */
					const range = [
						prevToken.type === 'Punctuator' && prevToken.value === ','
							? prevToken.range[0]
							: prevToken.range[1],
						closeParen.range[0]
					]

					context.report({
						loc: { start: prevToken.loc.end, end: openParen.loc.start },
						messageId: 'remove',
						fix: (fixer) => fixer.removeRange(range),
					})
				}
			}
		}
	}
}
