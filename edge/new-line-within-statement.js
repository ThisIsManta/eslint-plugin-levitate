const _ = require('lodash')
const detectIndent = require('detect-indent')

module.exports = {
	meta: {
		docs: {
			description: 'enforce having new lines within statement',
			category: 'Stylistic Issues',
		},
		fixable: 'whitespace',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					maxLength: { type: 'integer' },
				},
			},
		},
		messages: {
			before: 'Expected a new line before this.',
			after: 'Expected a new line after this.',
			noBefore: 'Unexpected a new line before this.',
			noAfter: 'Unexpected a new line after this.',
		}
	},
	create: function (context) {
		const code = context.getSourceCode()
		const options = _.defaultsDeep(context.options[0], { maxLength: Infinity })

		const topLevelChainedNodes = new Set()
		function checkIfNodeIsPartOfTopLevelChain(node) {
			if (!node.parent) {
				return false
			}

			if (topLevelChainedNodes.has(node)) {
				return true
			}

			if (node.type == 'CallExpression' && node.parent.type === 'CallExpression' && node.parent.arguments.includes(node)) {
				return false
			}

			return checkIfNodeIsPartOfTopLevelChain(node.parent)
		}

		function findOrderedChainNodes(node, outputList = []) {
			if (node.type === 'CallExpression') {
				if (node.callee.type === 'Identifier') {
					outputList.unshift(node.callee)

				} else {
					findOrderedChainNodes(node.callee, outputList)
				}

			} else if (node.type === 'MemberExpression') {
				if (!node.computed) {
					outputList.unshift(node.property)
				}

				findOrderedChainNodes(node.object, outputList)
			}

			return outputList
		}

		return {
			CallExpression: function (root) {
				if (root.callee.type !== 'MemberExpression') {
					return
				}

				if (checkIfNodeIsPartOfTopLevelChain(root)) {
					return
				} else {
					topLevelChainedNodes.add(root)
				}

				const chainList = findOrderedChainNodes(root)
				if (chainList.length === 0) {
					return
				}

				const text = code.getText(root)
				if (text.includes('\n') === false && unwrap(text).length <= options.maxLength) {
					return
				}

				for (let i = 1; i < chainList.length; i++) {
					const thisNode = chainList[i]
					const prevNode = chainList[i - 1]
					if (thisNode.loc.start.line === prevNode.loc.start.line) {
						const dot = code.getTokenBefore(thisNode)
						context.report({
							loc: dot.loc,
							messageId: 'before',
							fix: (fixer) => fixer.insertTextBefore(dot, '\n')
						})
					}
				}
			},
			LogicalExpression: function (root) {
				if (!Number.isFinite(options.maxLength)) {
					return
				}

				const text = code.getText(root)

				const newLineExpected = unwrap(text).length - root.operator.length > options.maxLength

				const first = code.getFirstToken(root.right)

				if (newLineExpected) {
					if (root.left.loc.end.line === root.right.loc.start.line) {
						const indentation = detectIndent(code.lines[root.left.loc.start.line - 1]).indent || ''
						context.report({
							loc: first.loc,
							messageId: 'before',
							fix: (fixer) => fixer.insertTextBefore(first, '\n' + indentation)
						})
					}

				} else {
					if (root.left.loc.end.line !== root.right.loc.start.line) {
						const operator = code.getTokenBefore(root.right)
						context.report({
							loc: first.loc,
							messageId: 'noBefore',
							fix: (fixer) => fixer.removeRange([operator.range[1], first.range[0]])
						})
					}

				}
			},
			IfStatement: function (root) {
				const text = code.getText(root.test)

				const first = code.getFirstToken(root.test)
				const last = code.getLastToken(root.test)

				const open = code.getTokenBefore(root.test)
				const close = code.getTokenAfter(root.test)

				const newLineExpected = root.test.loc.start.line !== root.test.loc.end.line ||
					unwrap(text).length > options.maxLength

				if (newLineExpected) {
					if (first.loc.start.line === open.loc.end.line) {
						context.report({
							loc: open.loc,
							messageId: 'after',
							fix: (fixer) => fixer.insertTextAfter(open, '\n')
						})
					}

					if (last.loc.end.line === close.loc.start.line) {
						context.report({
							loc: close.loc,
							messageId: 'before',
							fix: (fixer) => fixer.insertTextBefore(close, '\n')
						})
					}

				} else {
					if (first.loc.start.line !== open.loc.end.line) {
						context.report({
							loc: open.loc,
							messageId: 'noAfter',
							fix: (fixer) => fixer.removeRange([open.range[1], first.range[0]])
						})
					}

					if (last.loc.end.line !== close.loc.start.line) {
						context.report({
							loc: close.loc,
							messageId: 'noBefore',
							fix: (fixer) => fixer.removeRange([last.range[1], close.range[0]])
						})
					}
				}
			},
		}
	},
	tests: {
		valid: [
			{
				code: `
					_.chain().map().prop.reduce().value()
				`,
			},
			{
				code: `
					_.chain()
						.map()
						.prop
						.reduce(w().x())
						.value()
				`,
			},
			{
				code: `
					_.chain()
						.map()
						.prop
						.reduce(w().x())
						.value()
				`,
				options: [{ maxLength: 10 }],
			},
			{
				code: `
					x()
						.y()
						.z()
				`,
			},
			{
				code: `
					if (a) {}
					if (a && b) {}
				`,
			},
			{
				code: `
					const x = a && b
				`,
			},
			{
				code: `
function Component() {
	<div>
		{getClipboardText && (
			<InputAdornment position="end">
				<IconButton>
					<PasteIcon />
				</IconButton>
			</InputAdornment>
		)}
	</div>
}
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
		],
		invalid: [
			{
				code: `
					x().y()
				`,
				output: `
					x()
.y()
				`,
				options: [{ maxLength: 3 }],
				errors: [
					{ messageId: 'before', line: 2 },
				],
			},
			{
				code: `
					_.chain().map()['prop']
						.reduce().value().text
				`,
				output: `
					_.chain()
.map()['prop']
						.reduce()
.value().text
				`,
				errors: [
					{ messageId: 'before', line: 2 },
					{ messageId: 'before', line: 3 },
				],
			},
			{
				code: `
					x().y()
						.z()
				`,
				output: `
					x()
.y()
						.z()
				`,
				errors: [
					{ messageId: 'before', line: 2 },
				],
			},
			{
				code: `
					if (a &&
						b) {}
				`,
				output: `
					if (
a &&
						b
) {}
				`,
				options: [{ maxLength: 3 }],
				errors: [
					{ messageId: 'after', line: 2 },
					{ messageId: 'before', line: 3 },
				],
			},
			{
				code: `
					if (
						a && b
					) {}
				`,
				output: `
					if (a && b) {}
				`,
				errors: [
					{ messageId: 'noAfter', line: 2 },
					{ messageId: 'noBefore', line: 4 },
				],
			},
			{
				code: `
					const x = a && b || c && d
					const y = a &&
						b
				`,
				output: `
					const x = a && b || 
					c && d
					const y = a &&b
				`,
				options: [{ maxLength: 5 }],
				errors: [
					{ messageId: 'before', line: 2, column: 26 },
					{ messageId: 'noBefore', line: 4, column: 7 },
				],
			},
			{
				code: `
function Component() {
	<div>
		{getClipboardText && (<InputAdornment position="end">
				<IconButton>
					<PasteIcon />
				</IconButton>
			</InputAdornment>
		)}
	</div>
}
				`,
				output: `
function Component() {
	<div>
		{getClipboardText && (
		<InputAdornment position="end">
				<IconButton>
					<PasteIcon />
				</IconButton>
			</InputAdornment>
		)}
	</div>
}
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{ messageId: 'before', line: 4 },
				]
			},
		]
	}
}

function unwrap(text) {
	return text.replace(/\r?\n/g, '').replace(/\s+|\t+/g, ' ')
}
