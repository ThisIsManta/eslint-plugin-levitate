// @ts-check

const _ = require('lodash')

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
	meta: {
		docs: {
			description:
				'enforce having consistent new lines between parameters',
		},
		fixable: 'whitespace',
		messages: {
			add: 'Expected a new line here',
			remove: 'Unexpected a new line here',
		},
	},
	create: function (context) {
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
			const closeParen = context.sourceCode.getTokenAfter(params[params.length - 1], { filter: token => token.value === ')' })

			if (!openParen || !closeParen) {
				return
			}

			const multilineNeeded = (
				context.sourceCode.commentsExistBetween(openParen, closeParen) ||
				params.some((node, index, nodeList) => {
					const prevNode = nodeList[index - 1]
					if (!prevNode) {
						return false
					}

					return prevNode.loc?.end.line !== node.loc?.start.line
				})
			)

			for (let index = 0; index <= params.length; index++) {
				const prevNode = index === params.length
					? context.sourceCode.getTokenBefore(closeParen)
					: context.sourceCode.getTokenBefore(params[index])
				const nextNode = index === params.length
					? closeParen
					: context.sourceCode.getFirstToken(params[index])

				if (
					!prevNode || !prevNode.loc || !prevNode.range ||
					!nextNode || !nextNode.loc || !nextNode.range
				) {
					continue
				}

				if (multilineNeeded) {
					const tokens = [
						prevNode,
						...context.sourceCode.getTokensBetween(prevNode, nextNode, { includeComments: true }),
						nextNode,
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
							context.report({
								loc: { start: nextToken.loc.start, end: nextToken.loc.start },
								messageId: 'add',
								fix: (fixer) => fixer.insertTextBefore((/** @type {import('eslint').AST.Token} */ (nextToken)), '\n'),
							})

						} else if (newLineCount > 1) {
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

				} else {
					if (prevNode.loc.end.line !== nextNode.loc.start.line) {
						/** @type {import('eslint').AST.Range} */
						const range = [
							prevNode.value === ',' ? prevNode.range[0] : prevNode.range[1],
							nextNode.range[0]
						]

						context.report({
							loc: { start: context.sourceCode.getLocFromIndex(range[0]), end: context.sourceCode.getLocFromIndex(range[1]) },
							messageId: 'remove',
							fix: (fixer) => fixer.replaceTextRange(range, ''),
						})
					}
				}
			}
		}
	},
	tests: {
		valid: [
			{
				code: `
				function f() {}
				f()
				new Goo()
        `,
			},
			{
				code: `
				function f(a, b, c) {}
				const g = function (a, b, c) {}
				const h = (a, b, c) => {}
				f(a, b, c)
				new Goo(a, b, c)
        `,
			},
			{
				code: `
				function f(
					a,
					b,
					c,
				) {}
				f(
					a,
					b,
					c,
				)
				new Goo(
					a,
					b,
					c,
				)
        `,
			},
			{
				code: `
				function f(
					// Comment
					a,
				) {}
				f(
					// Comment
					a,
				)
        `,
			},
			{
				code: `
				beforeEach(() => {
				})
				it('test title', () => {
				}, { timeout: 30000 })
        `,
			},
		],
		invalid: [
			{
				code: `
				function f(a, b,
				c) {}
				f(a, b,
				c)
        `,
				errors: [
					{ messageId: 'add', line: 2, column: 16 },
					{ messageId: 'add', line: 2, column: 19 },
					{ messageId: 'add', line: 3, column: 6 },
					{ messageId: 'add', line: 4, column: 7 },
					{ messageId: 'add', line: 4, column: 10 },
					{ messageId: 'add', line: 5, column: 6 },
				],
				output: `
				function f(
a, 
b,
				c
) {}
				f(
a, 
b,
				c
)
        `,
			},
			{
				code: `
				function f(
					a,
				) {}
				f(
					a,
				)
        `,
				errors: [
					{ messageId: 'remove', line: 2, column: 16 },
					{ messageId: 'remove', line: 3, column: 7 },
					{ messageId: 'remove', line: 5, column: 7 },
					{ messageId: 'remove', line: 6, column: 7 },
				],
				output: `
				function f(a) {}
				f(a)
        `,
			},
			{
				code: `
				function f(// Comment
					a) {}
				f(// Comment
					a)
				`,
				errors: [
					{ messageId: 'add', line: 2, column: 16 },
					{ messageId: 'add', line: 3, column: 7 },
					{ messageId: 'add', line: 4, column: 7 },
					{ messageId: 'add', line: 5, column: 7 },
				],
				output: `
				function f(
// Comment
					a
) {}
				f(
// Comment
					a
)
				`,
			},
			{
				code: `
				function f(/* Comment */a
				) {}
				f(/* Comment */a
				)
        `,
				errors: [
					{ messageId: 'add', line: 2, column: 16 },
					{ messageId: 'add', line: 2, column: 29 },
					{ messageId: 'add', line: 4, column: 7 },
					{ messageId: 'add', line: 4, column: 20 },
				],
				output: `
				function f(
/* Comment */
a
				) {}
				f(
/* Comment */
a
				)
        `,
			},
			{
				code: `
				function f(/* Comment */

				// Comment
				
				a) {}
				f(/* Comment */

				// Comment

				a)
        `,
				errors: [
					{ messageId: 'add', line: 2, column: 16 },
					{ messageId: 'remove', line: 2, column: 29 },
					{ messageId: 'remove', line: 4, column: 15 },
					{ messageId: 'add', line: 6, column: 6 },
					{ messageId: 'add', line: 7, column: 7 },
					{ messageId: 'remove', line: 7, column: 20 },
					{ messageId: 'remove', line: 9, column: 15 },
					{ messageId: 'add', line: 11, column: 6 },
				],
				output: `
				function f(
/* Comment */
// Comment
a
) {}
				f(
/* Comment */
// Comment
a
)
        `,
			},
		],
	},
}
