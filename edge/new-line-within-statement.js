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
			paren: 'Expected a pair of parentheses around this.',
			noParen: 'Unexpected a pair of parentheses.',
		}
	},
	create: function (context) {
		const code = context.getSourceCode()
		const options = _.defaultsDeep(context.options[0], { maxLength: Infinity })

		const baseIndent = detectIndent(code.text).indent || ''

		function getIndentAt(line) {
			return detectIndent(code.lines[line - 1] || '').indent || ''
		}

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

		function checkIfLogicalExpressionNeedsNewLine(node) {
			return node.type === 'LogicalExpression' && unwrap(code.getText(node)).length - node.operator.length > options.maxLength
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

				if (root.right.type === 'JSXElement') {
					return
				}

				const newLineExpected = checkIfLogicalExpressionNeedsNewLine(root)

				const first = code.getFirstToken(root.right)

				if (newLineExpected) {
					if (root.left.loc.end.line === root.right.loc.start.line) {
						const prevIndent = getIndentAt(root.left.loc.start.line)
						context.report({
							loc: first.loc,
							messageId: 'before',
							fix: (fixer) => fixer.insertTextBefore(first, '\n' + prevIndent + baseIndent)
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
			ConditionalExpression: function (root) {
				let question = code.getTokenBefore(root.consequent)
				while (question && question.value !== '?') {
					question = code.getTokenBefore(question)
				}

				let colon = code.getTokenBefore(root.alternate)
				while (colon && colon.value !== ':') {
					colon = code.getTokenBefore(colon)
				}

				if (!question || !colon) {
					return
				}

				const newLineExpected = unwrap(code.getText(root)).length - 2 > options.maxLength ||
					root.test.loc.start.line !== root.consequent.loc.start.line

				const prevIndent = getIndentAt(root.loc.start.line)

				if (newLineExpected) {
					if (code.getTokenBefore(question).loc.end.line === question.loc.start.line) {
						context.report({
							loc: question.loc,
							messageId: 'before',
							fix: (fixer) => fixer.insertTextBefore(question, '\n' + prevIndent + baseIndent)
						})
					}

					if (code.getTokenBefore(colon).loc.end.line === colon.loc.start.line) {
						context.report({
							loc: colon.loc,
							messageId: 'before',
							fix: (fixer) => fixer.insertTextBefore(colon, '\n' + prevIndent + baseIndent)
						})
					}

				} else {
					if (root.test.loc.end.line !== question.loc.start.line) {
						context.report({
							loc: question.loc,
							messageId: 'noBefore',
							fix: (fixer) => fixer.replaceTextRange([code.getTokenBefore(question).range[1], question.range[0]], ' ')
						})
					}

					if (root.consequent.loc.end.line !== colon.loc.start.line) {
						context.report({
							loc: colon.loc,
							messageId: 'noBefore',
							fix: (fixer) => fixer.replaceTextRange([code.getTokenBefore(colon).range[1], question.range[0]], ' ')
						})
					}
				}

				const truthy = code.getTokenAfter(question)
				if (question.loc.start.line !== truthy.loc.start.line) {
					context.report({
						loc: truthy.loc,
						messageId: 'noBefore',
						fix: (fixer) => fixer.replaceTextRange([question.range[1], truthy.range[0]], ' ')
					})
				}

				const falsy = code.getTokenAfter(colon)
				if (colon.loc.start.line !== falsy.loc.start.line) {
					context.report({
						loc: falsy.loc,
						messageId: 'noBefore',
						fix: (fixer) => fixer.replaceTextRange([colon.range[1], falsy.range[0]], ' ')
					})
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
			JSXElement: function (root) {
				if (root.parent.type === 'JSXElement') {
					return
				}

				const prev = code.getTokenBefore(root)
				const next = code.getTokenAfter(root)
				if (!prev || !next) {
					return
				}

				const prevPrev = code.getTokenBefore(prev)

				if (root.parent.type === 'CallExpression' && root.parent.arguments.includes(root)) {
					if (prev.value === '(' && next.value === ')') {
						context.report({
							loc: { start: prev.loc.start, end: next.loc.end },
							messageId: 'noParen',
							fix: (fixer) => [
								fixer.removeRange([prev.range[0], root.range[0]]),
								fixer.removeRange([root.range[1], next.range[1]]),
							]
						})
					}

					return
				}

				const newLineExpected = (
					root.loc.start.line !== root.loc.end.line ||
					checkIfLogicalExpressionNeedsNewLine(root.parent) && root.parent.right === root
				)

				if (newLineExpected) {
					if (prev.value === '(' && next.value === ')') {
						if (prevPrev && prevPrev.loc.end.line !== prev.loc.start.line) {
							context.report({
								loc: prev,
								messageId: 'noBefore',
								fix: (fixer) => fixer.removeRange([prevPrev.range[1], prev.range[0]])
							})
						}

						if (prev.loc.end.line === root.loc.start.line) {
							const prevIndent = getIndentAt(root.loc.start.line)
							context.report({
								loc: code.getFirstToken(root).loc,
								messageId: 'before',
								fix: (fixer) => fixer.insertTextBefore(root, '\n' + prevIndent + baseIndent)
							})
						}

						if (next.loc.start.line === root.loc.end.line) {
							context.report({
								loc: code.getLastToken(root).loc,
								messageId: 'after',
								fix: (fixer) => fixer.insertTextAfter(root, '\n')
							})
						}

					} else {
						if (prev.loc.end.line === root.loc.start.line) {
							const prevIndent = getIndentAt(root.loc.start.line)
							context.report({
								loc: code.getFirstToken(root).loc,
								messageId: 'before',
								fix: (fixer) => [
									fixer.insertTextBefore(root, '(\n' + prevIndent + baseIndent),
									fixer.insertTextAfter(root, '\n' + prevIndent + ')'),
								]
							})

						} else {
							context.report({
								node: root,
								messageId: 'paren',
								fix: (fixer) => [
									fixer.insertTextAfter(prev, ' ('),
									fixer.insertTextAfter(root, '\n)'),
								]
							})
						}

						if (next.loc.start.line === root.loc.end.line) {
							context.report({
								loc: code.getLastToken(root).loc,
								messageId: 'after',
								fix: (fixer) => fixer.insertTextAfter(root, '\n)')
							})
						}
					}

				} else { // Remove new lines
					if (prev.value === '(' && next.value === ')' && root.parent.type !== 'IfStatement') {
						const space = code.isSpaceBetween(prevPrev, prev) ? '' : ' '
						context.report({
							loc: { start: prev.loc.start, end: next.loc.end },
							messageId: 'noParen',
							fix: (fixer) => [
								fixer.replaceTextRange([prev.range[0], root.range[0]], space),
								fixer.removeRange([root.range[1], next.range[1]]),
							]
						})

					} else {
						if (prev.loc.end.line !== root.loc.start.line) {
							context.report({
								loc: code.getFirstToken(root).loc,
								messageId: 'noBefore',
								fix: (fixer) => fixer.replaceTextRange([prev.range[1], root.range[0]], ' ')
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
	return (
		<div>
			{getClipboardText && (
				<InputAdornment position="end">
					<IconButton>
						<PasteIcon />
					</IconButton>
				</InputAdornment>
			)}
		</div>
	)
}
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
ReactDOM.render(
	<Playbook
		pages={demoComponents}
		contentControl={LanguageSelection}
		contentWrapper={LanguageProvider}
	/>,
	document.getElementById('root')
)
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
const x = a ? b : c
const y = a
	? b
	: c
const z = aaaaaaaaaa
	? bbbbbbbbbb
	: cccccccccc
				`,
				options: [{ maxLength: 10 }],
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
					{ messageId: 'before', line: 2, column: 21 },
					{ messageId: 'noBefore', line: 4, column: 2 },
				],
			},
			{
				code: `
function Component(x) {
	const a = x && <div/>
	const b = x &&
		<div/>
	const c = x && (<div/>)
	const d = x && (<div>
		text
		</div>)
}
				`,
				output: `
function Component(x) {
	const a = x && <div/>
	const b = x && <div/>
	const c = x && <div/>
	const d = x && (
		<div>
		text
		</div>
)
}
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{ messageId: 'noBefore', line: 5 },
					{ messageId: 'noParen', line: 6 },
					{ messageId: 'before', line: 7 },
					{ messageId: 'after', line: 9 },
				]
			},
			{
				code: `
ReactDOM.render(
	(
		<Playbook
			pages={demoComponents}
			contentControl={LanguageSelection}
			contentWrapper={LanguageProvider}
		/>
	),
	document.getElementById('root')
)
				`,
				output: `
ReactDOM.render(
	<Playbook
			pages={demoComponents}
			contentControl={LanguageSelection}
			contentWrapper={LanguageProvider}
		/>,
	document.getElementById('root')
)
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{ messageId: 'noParen', line: 3 },
				]
			},
			{
				code: `
function Component() {
	return (<div>
		{array.length > 0 && (<Grid>
			<Grid.Gap height={10} />
		</Grid>)}
	</div>)
}
				`,
				output: `
function Component() {
	return (
		<div>
		{array.length > 0 && (
			<Grid>
			<Grid.Gap height={10} />
		</Grid>
)}
	</div>
)
}
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{ messageId: 'before', line: 3 },
					{ messageId: 'before', line: 4 },
					{ messageId: 'after', line: 6 },
					{ messageId: 'after', line: 7 },
				]
			},
			{
				code: `
const footerItems = _.compact([
	props.isShowMobileAppLink && (
		<MobileAppLink />
	),
	props.unsubscribeLink && (
		<UnsubscriptionLink unsubscribeLink={props.unsubscribeLink} />
	),
])
				`,
				output: `
const footerItems = _.compact([
	props.isShowMobileAppLink && <MobileAppLink />,
	props.unsubscribeLink && (
		<UnsubscriptionLink unsubscribeLink={props.unsubscribeLink} />
	),
])
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{ messageId: 'noParen', line: 3 },
				]
			},
			{
				code: `
function MyComponent() {
	return !excludeAttachment && isAttachment(props.message) && <Attachment attachment={props.message.metadata.attachments[0]} />
}
				`,
				output: `
function MyComponent() {
	return !excludeAttachment && isAttachment(props.message) && (
		<Attachment attachment={props.message.metadata.attachments[0]} />
	)
}
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{ messageId: 'before', line: 3, column: 62 },
				]
			},
			{
				code: `
const x = {
	title: __('email_renderer.tags'),
	value: _.isEmpty(props.task.tags) ? 'n/a' : (
		<span>
			{_.map(props.task.tags, (tag, index, tags) => (
				<span key={index}>
					<Tag tag={tag} />
					{index < tags.length - 1 ? ', ' : ''}
				</span>
			))}
		</span>
	),
}
				`,
				output: `
const x = {
	title: __('email_renderer.tags'),
	value: _.isEmpty(props.task.tags) 
		? 'n/a' 
		: (
		<span>
			{_.map(props.task.tags, (tag, index, tags) => (
				<span key={index}>
					<Tag tag={tag} />
					{index < tags.length - 1 ? ', ' : ''}
				</span>
			))}
		</span>
	),
}
				`,
				options: [{ maxLength: 80 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{ messageId: 'before', line: 4, column: 36 },
					{ messageId: 'before', line: 4, column: 44 },
				]
			},
			{
				code: `
const x = a
	?
	b
	:
	c
const y = a
	? b
	: c
const z = aaaaaaaaaa ? bbbbbbbbbb : cccccccccc
const w = aaaaaaaaaa ? bbbbbbbbbb :
	cccccccccc
const u = aaaaaaaaaa ?
	bbbbbbbbbb :
	cccccccccc
				`,
				output: `
const x = a
	? b
	: c
const y = a
	? b
	: c
const z = aaaaaaaaaa 
	? bbbbbbbbbb 
	: cccccccccc
const w = aaaaaaaaaa 
	? bbbbbbbbbb 
	: cccccccccc
const u = aaaaaaaaaa 
	? bbbbbbbbbb 
	: cccccccccc
				`,
				options: [{ maxLength: 10 }],
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{ messageId: 'noBefore', line: 4 },
					{ messageId: 'noBefore', line: 6 },
					{ messageId: 'before', line: 10, column: 22 },
					{ messageId: 'before', line: 10, column: 35 },
					{ messageId: 'before', line: 11, column: 22 },
					{ messageId: 'before', line: 11, column: 35 },
					{ messageId: 'noBefore', line: 12 },
					{ messageId: 'before', line: 13 },
					{ messageId: 'noBefore', line: 14 },
					{ messageId: 'before', line: 14 },
					{ messageId: 'noBefore', line: 15 },
				]
			},
		]
	}
}

function unwrap(text) {
	return text.replace(/\r?\n/g, '').replace(/\s+|\t+/g, ' ')
}
