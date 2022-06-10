/**
 * @author Mathias Schreck <https://github.com/lo1tuma>
 */

const _ = require('lodash')

module.exports = {
	meta: {
		type: "layout",
		docs: {
			description: "enforce having new lines between blocks and before `else` and `catch`",
		},
		fixable: "whitespace",
		messages: {
			always: 'Expected to have one or more blank lines',
			never: 'Expected not to have any blank lines',
		}
	},
	create: function (context) {
		const sourceCode = context.getSourceCode()

		function getOpenBrace(node) {
			if (node.type === "SwitchStatement") {
				return sourceCode.getTokenBefore(node.cases[0])
			}
			return sourceCode.getFirstToken(node)
		}

		function getFirstBlockToken(token) {
			let prev,
				first = token

			do {
				prev = first
				first = sourceCode.getTokenAfter(first, { includeComments: true })
			} while (isComment(first) && first.loc.start.line === prev.loc.end.line)

			return first
		}

		function getLastBlockToken(token) {
			let last = token,
				next

			do {
				next = last
				last = sourceCode.getTokenBefore(last, { includeComments: true })
			} while (isComment(last) && last.loc.end.line === next.loc.start.line)

			return last
		}

		function checkPadding(node, blockMustHaveTopPadding, blockMustHaveBottomPadding) {
			const openBrace = getOpenBrace(node)
			const firstBlockToken = getFirstBlockToken(openBrace)
			const tokenBeforeFirst = sourceCode.getTokenBefore(firstBlockToken, { includeComments: true })
			const closeBrace = sourceCode.getLastToken(node)
			const lastBlockToken = getLastBlockToken(closeBrace)
			const tokenAfterLast = sourceCode.getTokenAfter(lastBlockToken, { includeComments: true })
			const blockHasTopPadding = isPaddingBetweenTokens(tokenBeforeFirst, firstBlockToken)
			const blockHasBottomPadding = isPaddingBetweenTokens(lastBlockToken, tokenAfterLast)

			if (blockMustHaveTopPadding && !blockHasTopPadding) {
				context.report({
					node,
					loc: { line: tokenBeforeFirst.loc.start.line, column: tokenBeforeFirst.loc.start.column },
					messageId: 'always',
					fix(fixer) {
						return fixer.insertTextAfter(tokenBeforeFirst, "\n")
					},
				})
			}

			if (!blockMustHaveTopPadding && blockHasTopPadding) {
				context.report({
					node,
					loc: { line: tokenBeforeFirst.loc.start.line, column: tokenBeforeFirst.loc.start.column },
					messageId: 'never',
					fix(fixer) {
						return fixer.replaceTextRange([tokenBeforeFirst.range[1], firstBlockToken.range[0] - firstBlockToken.loc.start.column], "\n")
					},
				})
			}

			if (blockMustHaveBottomPadding && !blockHasBottomPadding) {
				context.report({
					node,
					loc: { line: tokenAfterLast.loc.end.line, column: tokenAfterLast.loc.end.column - 1 },
					messageId: 'always',
					fix(fixer) {
						return fixer.insertTextAfter(lastBlockToken, "\n")
					},
				})
			}

			if (!blockMustHaveBottomPadding && blockHasBottomPadding) {
				context.report({
					node,
					loc: { line: tokenAfterLast.loc.end.line, column: tokenAfterLast.loc.end.column - 1 },
					messageId: 'never',
					fix(fixer) {
						return fixer.replaceTextRange([lastBlockToken.range[1], tokenAfterLast.range[0] - tokenAfterLast.loc.start.column], "\n")
					}
				})
			}
		}

		return {
			BlockStatement(node) {
				if (node.body.length === 0) {
					return
				}

				const ancestorNodes = context.getAncestors(node)
				const parentNode = _.last(ancestorNodes)
				const ifElseFound = !!parentNode && parentNode.type === 'IfStatement' && parentNode.consequent === node && !!parentNode.alternate
				const tryCatchFound = !!parentNode && parentNode.type === 'TryStatement' && parentNode.handler && parentNode.handler.type === 'CatchClause'

				checkPadding(node, false, ifElseFound || tryCatchFound)

				// Expect a new line after non-last blocks
				if (parentNode && !ifElseFound && !tryCatchFound) {
					const grandParentNode = ancestorNodes[ancestorNodes.indexOf(parentNode) - 1]
					if (grandParentNode && Array.isArray(grandParentNode.body) && _.last(grandParentNode.body) !== parentNode) {
						const closeBrace = sourceCode.getLastToken(node)
						const nextToken = sourceCode.getTokenAfter(node)
						if (closeBrace && nextToken && !isPaddingBetweenTokens(closeBrace, nextToken)) {
							context.report({
								loc: { line: node.loc.end.line, column: node.loc.end.column - 1 },
								messageId: 'always',
								fix(fixer) {
									return fixer.insertTextAfter(closeBrace, "\n")
								},
							})
						}
					}
				}
			},
			SwitchStatement(node) {
				if (node.cases.length === 0) {
					return
				}

				checkPadding(node, false, false)
			},
			ClassBody(node) {
				if (node.body.length === 0) {
					return
				}

				checkPadding(node, false, false)
			},
		}
	},
	tests: {
		valid: [
			"{\na();\n}",
			"{\n//comment\na();\n}",
			"{\na();\n//comment\n}",
			"{\na()\n//comment\n}",
			"{\na = 1\n}",
			"{//comment\na();\n}",
			"{ /* comment */\na();\n}",
			"{ /* comment \n */\na();\n}",
			"{ /* comment \n */ /* another comment \n */\na();\n}",
			"{ /* comment \n */ /* another comment \n */\na();\n/* comment \n */ /* another comment \n */}",
			"{\na();\n/* comment */ }",
			"{\na();\n}",
			"{\na();}",
			"{a();\n}",
			"{a();}",
			"{//comment\na();}",
			"{\n//comment\na()\n}",
			"{a();//comment\n}",
			"{\na();\n//comment\n}",
			"{\na()\n//comment\n}",
			"{\na()\n//comment\nb()\n}",
			"function a() {\n/* comment */\nreturn;\n/* comment*/\n}",
			"{\n// comment\ndebugger;\n// comment\n}",
			"{\n// comment\nif (\n// comment\n a) {}\n }",
			"switch (a) {\ncase 0: foo();\n}",
			{ code: "class A{\nfoo(){}\n}", parserOptions: { ecmaVersion: 6 } },
			`
			if (b) {
				a()

			} else {
				a()
			}
			`,
			`
			if (b) {
				a()
			}

			if (b) {
				a()
			}
			`,
			`
			function foo() {
				if (b) {
					a()
				}

				return c
			}
			`,
			`
			if (b) {
				while (true) {
					a()
				}
			}
			`,
			`
			try {
				a()

			} catch (error) {
				a()
			}
			`,
		],
		invalid: [
			{
				code: "{\na()\n//comment\n\n}",
				output: "{\na()\n//comment\n}",
				errors: [
					{
						messageId: 'never',
						line: 5
					}
				]
			},
			{
				code: "{\n\na();\n\n}",
				output: "{\na();\n}",
				errors: [
					{
						messageId: 'never',
						line: 1
					},
					{
						messageId: 'never',
						line: 5
					}
				]
			},
			{
				code: "{\r\n\r\na();\r\n\r\n}",
				output: "{\na();\n}",
				errors: [
					{
						messageId: 'never',
						line: 1
					},
					{
						messageId: 'never',
						line: 5
					}
				]
			},
			{
				code: "{\n\n\n  a();\n\n\n}",
				output: "{\n  a();\n}",
				errors: [
					{
						messageId: 'never',
						line: 1
					},
					{
						messageId: 'never',
						line: 7
					}
				]
			},
			{
				code: "{\n\na();\n}",
				output: "{\na();\n}",
				errors: [
					{
						messageId: 'never',
						line: 1
					}
				]
			},
			{
				code: "{\n\n\ta();\n}",
				output: "{\n\ta();\n}",
				errors: [
					{
						messageId: 'never',
						line: 1
					}
				]
			},
			{
				code: "{\na();\n\n}",
				output: "{\na();\n}",
				errors: [
					{
						messageId: 'never',
						line: 4
					}
				]
			},
			{
				code: "  {\n    a();\n\n  }",
				output: "  {\n    a();\n  }",
				errors: [
					{
						messageId: 'never',
						line: 4
					}
				]
			},
			{
				code: "{\n\n// comment\nif (\n// comment\n a) {}\n}",
				output: "{\n// comment\nif (\n// comment\n a) {}\n}",
				errors: [
					{
						messageId: 'never',
						line: 1,
						column: 1
					}
				]
			},
			{
				code: "{\n\n// comment\nif (\n// comment\n a) {}\n}",
				output: "{\n// comment\nif (\n// comment\n a) {}\n}",
				errors: [
					{
						messageId: 'never',
						line: 1,
						column: 1
					}
				]
			},
			{
				code: "switch (a) {\n\ncase 0: foo();\n\n}",
				output: "switch (a) {\ncase 0: foo();\n}",
				errors: [
					{
						messageId: 'never',
						line: 1,
						column: 12
					},
					{
						messageId: 'never',
						line: 5,
						column: 1
					}
				]
			},
			{
				code: "switch (a) {\n\ncase 0: foo();\n}",
				output: "switch (a) {\ncase 0: foo();\n}",
				errors: [
					{
						messageId: 'never',
						line: 1,
						column: 12
					}
				]
			},
			{
				code: "switch (a) {\ncase 0: foo();\n\n  }",
				output: "switch (a) {\ncase 0: foo();\n  }",
				errors: [
					{
						messageId: 'never',
						line: 4,
						column: 3
					}
				]
			},
			{
				code: "class A {\n\nconstructor(){\n\nfoo();\n\n}\n\n}",
				output: "class A {\nconstructor(){\nfoo();\n}\n}",
				parserOptions: { ecmaVersion: 6 },
				errors: [
					{
						messageId: 'never',
						line: 1
					},
					{
						messageId: 'never',
						line: 3
					},
					{
						messageId: 'never',
						line: 7
					},
					{
						messageId: 'never',
						line: 9
					}
				]
			},
			{
				code: "class A {\n\nconstructor(){\n\nfoo();\n\n}\n\n}",
				output: "class A {\nconstructor(){\nfoo();\n}\n}",
				parserOptions: { ecmaVersion: 6 },
				errors: [
					{
						messageId: 'never',
						line: 1
					},
					{
						messageId: 'never',
						line: 3
					},
					{
						messageId: 'never',
						line: 7
					},
					{
						messageId: 'never',
						line: 9
					}
				]
			},
			{
				code: "class A {\n\nconstructor(){\n\nfoo();\n\n}\n\n}",
				output: "class A {\nconstructor(){\nfoo();\n}\n}",
				parserOptions: { ecmaVersion: 6 },
				errors: [
					{
						messageId: 'never',
						line: 1
					},
					{
						messageId: 'never',
						line: 3
					},
					{
						messageId: 'never',
						line: 7
					},
					{
						messageId: 'never',
						line: 9
					}
				]
			},
			{
				code: "function foo() { // a\n\n  b;\n}",
				output: "function foo() { // a\n  b;\n}",
				errors: [{ messageId: 'never' }]
			},
			{
				code: "function foo() { /* a\n */\n\n  bar;\n}",
				output: "function foo() { /* a\n */\n  bar;\n}",
				errors: [{ messageId: 'never' }]
			},
			{
				code: `
					if (b) {
						a()
					} else {
						a()
					}
				`,
				output: `
					if (b) {
						a()

					} else {
						a()
					}
				`,
				errors: [{ messageId: 'always' }]
			},
			{
				code: `
					if (b) {
						a()
					}
					if (b) {
						a()
					}
				`,
				output: `
					if (b) {
						a()
					}

					if (b) {
						a()
					}
				`,
				errors: [{ messageId: 'always' }]
			},
			{
				code: `
					function foo() {
						if (b) {
							a()
						}
						return c
					}
				`,
				output: `
					function foo() {
						if (b) {
							a()
						}

						return c
					}
				`,
				errors: [{ messageId: 'always' }]
			},
			{
				code: `
					try {
						a()
					} catch (error) {
						a()
					}
				`,
				output: `
					try {
						a()

					} catch (error) {
						a()
					}
				`,
				errors: [{ messageId: 'always' }]
			},
		]
	}
}

function isComment(node) {
	return node.type === "Line" || node.type === "Block"
}

function isPaddingBetweenTokens(first, second) {
	return second.loc.start.line - first.loc.end.line >= 2
}
