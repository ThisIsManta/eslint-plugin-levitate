// @ts-check

const _ = require('lodash')

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
	meta: {
		docs: {
			description:
				'enforce having a new line at the end of a non-last block and the other way around',
		},
		fixable: 'whitespace',
		messages: {
			add: 'Expected an empty line before here',
			remove: 'Expected no empty lines before here'
		},
	},
	create: function (context) {
		return {
			BlockStatement: function (node) {
				const openBrace = context.sourceCode.getFirstToken(node)
				if (!openBrace?.loc || !openBrace?.range) {
					return
				}

				const nextToken = context.sourceCode.getTokenAfter(openBrace, { includeComments: true })
				if (!nextToken?.loc || !nextToken?.range) {
					return
				}

				const closeBrace = context.sourceCode.getLastToken(node)
				if (!closeBrace?.loc || !closeBrace?.range) {
					return
				}

				const prevToken = context.sourceCode.getTokenBefore(closeBrace, { includeComments: true })
				if (!prevToken?.loc || !prevToken?.range) {
					return
				}

				// Skip empty blocks
				if (prevToken.type === 'Punctuator' && prevToken.value === '{') {
					return
				}

				const leadingNewLineCount = nextToken.loc.end.line - openBrace.loc.end.line
				if (leadingNewLineCount > 1) {
					/** @type {import('eslint').AST.Range} */
					const range = [
						openBrace.range[1],
						context.sourceCode.getIndexFromLoc({ line: nextToken.loc.start.line, column: 0 }) - 1
					]

					context.report({
						loc: { start: { line: openBrace.loc.end.line + 1, column: 0 }, end: nextToken.loc.start },
						messageId: 'remove',
						fix: (fixer) => fixer.removeRange(range),
					})
				}

				const trailingNewLineCount = closeBrace.loc.start.line - prevToken.loc.end.line
				if (
					node.parent.type === 'IfStatement' && node.parent.consequent === node && !!node.parent.alternate ||
					node.parent.type === 'TryStatement' && node.parent.block === node ||
					node.parent.type === 'SwitchCase' && node.parent.consequent.length === 1 && node.parent.consequent[0] === node && node.parent.parent.type === 'SwitchStatement' && node.parent.parent.cases.indexOf(node.parent) < node.parent.parent.cases.length - 1
				) {
					if (trailingNewLineCount === 1) {
						/** @type {import('eslint').AST.Range} */
						const range = [
							prevToken.range[1],
							prevToken.range[1]
						]

						context.report({
							loc: { start: closeBrace.loc.start, end: closeBrace.loc.start },
							messageId: 'add',
							fix: (fixer) => fixer.insertTextBeforeRange(range, '\n'),
						})
					}

				} else {
					if (trailingNewLineCount > 1) {
						/** @type {import('eslint').AST.Range} */
						const range = [
							prevToken.range[1],
							context.sourceCode.getIndexFromLoc({ line: closeBrace.loc.start.line, column: 0 }) - 1
						]

						context.report({
							loc: { start: { line: prevToken.loc.end.line + 1, column: 0 }, end: closeBrace.loc.start },
							messageId: 'remove',
							fix: (fixer) => fixer.removeRange(range),
						})
					}
				}
			},
			SwitchStatement: function (root) {
				for (let index = 0; index < root.cases.length; index++) {
					const node = root.cases[index]

					if (node.consequent.length === 1 && node.consequent[0].type === 'BlockStatement') {
						// Skip processing as this is handled by `BlockStatement` callback above
						continue
					}

					let lastToken = context.sourceCode.getLastToken(node, { includeComments: true })
					while (lastToken) {
						const nextToken = context.sourceCode.getTokenAfter(lastToken, { includeComments: true })
						if (nextToken && (nextToken.type === 'Line' || nextToken.type === 'Block') && nextToken.loc?.start.line === lastToken.loc?.end.line) {
							lastToken = nextToken
						} else {
							break
						}
					}

					if (!lastToken?.loc || !lastToken?.range) {
						continue
					}

					const nextToken = context.sourceCode.getTokenAfter(lastToken, { includeComments: true })

					if (!nextToken?.loc || !nextToken?.range) {
						continue
					}

					const newLineCount = nextToken.loc.start.line - lastToken.loc.end.line

					if (node.consequent.length === 0 || index !== root.cases.length - 1) {
						if (newLineCount > 1) {
							/** @type {import('eslint').AST.Range} */
							const range = [
								lastToken.range[1],
								context.sourceCode.getIndexFromLoc({ line: nextToken.loc.start.line, column: 0 }) - 1
							]

							context.report({
								loc: { start: { line: lastToken.loc.end.line + 1, column: 0 }, end: nextToken.loc.start },
								messageId: 'remove',
								fix: (fixer) => fixer.removeRange(range),
							})
						}

					} else {
						if (newLineCount < 2) {
							/** @type {import('eslint').AST.Range} */
							const range = [
								lastToken.range[1],
								lastToken.range[1],
							]

							context.report({
								loc: { start: nextToken.loc.start, end: nextToken.loc.start },
								messageId: 'add',
								fix: (fixer) => fixer.insertTextBeforeRange(range, '\n'),
							})
						}
					}
				}
			},
		}
	},
	tests: {
		valid: [
			{
				code: `
				function f() {}
				function g() {
				}
				function h() {

				}
				function i() {
					// Comment
				}
				function j() { // Comment
				}
				`,
			},
			{
				code: `
				if (a) {}
				if (a) {
				}
				if (a) {
					// Comment
				}
				`,
			},
			{
				code: `
				if (a) {
					// Comment

				} else {
					// Comment
				}
				`,
			},
			{
				code: `
				try {
					// Comment

				} catch {
					// Comment
				}
				`,
			},
		],
		invalid: [
			{
				code: `
				if (a) {
					// Comment
				} else {
					// Comment

				}
				`,
				errors: [
					{ messageId: 'add', line: 4, column: 5 },
					{ messageId: 'remove', line: 6, column: 1 },
				],
				output: `
				if (a) {
					// Comment

				} else {
					// Comment
				}
				`,
			},
			{
				code: `
				try {
					// Comment
				} catch {
					// Comment

				}
				`,
				errors: [
					{ messageId: 'add', line: 4, column: 5 },
					{ messageId: 'remove', line: 6, column: 1 },
				],
				output: `
				try {
					// Comment

				} catch {
					// Comment
				}
				`,
			},
			{
				code: `
				function f() {

					// Comment
				
				}
				`,
				errors: [
					{ messageId: 'remove', line: 3, column: 1 },
					{ messageId: 'remove', line: 5, column: 1 },
				],
				output: `
				function f() {
					// Comment
				}
				`,
			},
			{
				code: `
				switch (a) {
					case 1: // Comment

					case 2: {
						// Comment
					} // Comment
					default: {
						// Comment

					}
				}
				`,
				errors: [
					{ messageId: 'remove', line: 4, column: 1 },
					{ messageId: 'add', line: 7, column: 6 },
					{ messageId: 'remove', line: 10, column: 1 },
				],
				output: `
				switch (a) {
					case 1: // Comment
					case 2: {
						// Comment

					} // Comment
					default: {
						// Comment
					}
				}
				`,
			},
		],
	},
}
