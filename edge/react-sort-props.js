const _ = require('lodash')

const DEFAULT_PROPS_ORDER = [
	'key',
	'ref',
	'className',
	'*ClassName',
	'*',
	'children',
	'on*',
	'data-*',
]

module.exports = {
	meta: {
		type: 'layout',
		docs: {
			description: 'enforce consistent props sorting',
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
	create: function (context) {
		const matchers = (context.options[0] || DEFAULT_PROPS_ORDER).map(pattern => pattern === '*' ? null : new RegExp('^' + pattern.replace(/\*/g, '.+') + '$'))
		const sourceCode = context.getSourceCode()
		const wholeFileText = sourceCode.getText()

		return {
			TSTypeLiteral: function (root) { // Match `type Props = { ... }` and `function (props: { ... })`
				if (!findPropTypeDeclaration(root.parent)) {
					return
				}

				const propSegments = root.members.reduce((groups, node) => {
					if (node.type === 'TSPropertySignature' && node.key.type === 'Identifier') {
						if (groups.length === 0) {
							groups.push({})
						}
						_.last(groups)[node.key.name] = node
					} else if (groups.length > 0) {
						// Skip processing non-literal attributes by creating a new group
						groups.push({})
					}
					return groups
				}, [])

				for (const props of propSegments) {
					check(props)
				}
			},
			JSXOpeningElement: function (root) {
				const propSegments = root.attributes.reduce((groups, node) => {
					if (node.type === 'JSXAttribute' && node.name.type === 'JSXIdentifier') {
						if (groups.length === 0) {
							groups.push({})
						}
						_.last(groups)[node.name.name] = node
					} else if (groups.length > 0) {
						// Skip processing non-literal attributes by creating a new group
						groups.push({})
					}
					return groups
				}, [])

				for (const props of propSegments) {
					check(props)
				}
			},
		}

		function findPropTypeDeclaration(node) {
			if (!node || node.type === 'Program' || node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') {
				return null
			}

			if (node.type === 'TSTypeAliasDeclaration' && node.id.type === 'Identifier' && /Props$/.test(node.id.name)) {
				return node
			}

			if (node.type === 'TSTypeAnnotation' && node.parent.type === 'Identifier' && node.parent.name === 'props') {
				return node
			}

			return findPropTypeDeclaration(node.parent)
		}

		function findIndex(name) {
			let starIndex = matchers.indexOf(null)
			if (starIndex === -1) {
				starIndex = Infinity
			}

			let matchingIndex = -1
			for (let index = 0; index < matchers.length; index++) {
				if (matchers[index] && matchers[index].test(name)) {
					matchingIndex = index
					break
				}
			}

			return matchingIndex >= 0 ? matchingIndex : starIndex
		}

		function check(props /* { [propName: string]: KeyAndValueNode, ... } */) {
			const originalNames = _.keys(props)

			if (originalNames.length === 0) {
				return
			}

			const sortedNames = _.sortBy(originalNames, findIndex)

			const takenComments = new Set()
			const surroundingCommentMap = new Map()
			for (const node of _.values(props)) {
				const aboveComments = _.reject(sourceCode.getCommentsBefore(node), comment => takenComments.has(comment))
				for (const comment of aboveComments) {
					takenComments.add(comment)
				}

				const rightComment = _.find(sourceCode.getCommentsAfter(node), comment =>
					comment.type === 'Line' &&
					comment.loc.start.line === node.loc.end.line
				)
				if (rightComment) {
					takenComments.add(rightComment)
				}

				surroundingCommentMap.set(node, { aboveComments, rightComment })
			}

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
						node: foundNode,
						message: `Expected the prop \`${expectedName}\` to be sorted here`,
						fix: fixer => _.chain(props)
							.values()
							.map((originalNode, index) => {
								if (originalNames[index] === sortedNames[index]) {
									return null
								}

								const expandedOriginalRange = getNodeRangeWithComments(originalNode)
								const [originalSeparator] = sourceCode.getText(originalNode).match(/[;,]$/) || ['']

								const replacementNode = props[sortedNames[index]]
								const expandedReplacementRange = getNodeRangeWithComments(replacementNode)
								const replacementText =
									wholeFileText.substring(expandedReplacementRange[0], replacementNode.range[0]) +
									sourceCode.getText(replacementNode).replace(/[;,]$/, '') + originalSeparator +
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
	},
	tests: {
		valid: [
			{
				code: `
				type Props = {
					key: string
					ref: Ref
					className: string
					contentClassName: string
					everythingElse: string
					onKeyUp: () => void
					onClick: () => void
					'data-name': string
				}
        function C(props: {
					key: string
					ref: Ref
					className: string
					contentClassName: string
					everythingElse: string
					onKeyUp: () => void
					onClick: () => void
					'data-name': string
				}) {
					return (
						<div
							key=""
							ref={() => {}}
							className=""
							contentClassName=""
							everythingElse=""
							onKeyUp=""
							onClick=""
							data-name=""
						/>
					)
				}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
        function C(props: {
					key: string
					onClick: () => void
					everythingElse: string
				}) {
					return (
						<div
							key=""
							onClick=""
							ref=""
							everythingElse=""
						/>
					)
				}
				`,
				options: [['key', 'on*']],
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
        function C() {
					return (
						<div
							everythingElse=""
						/>
					)
				}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
        function C() {
					return (
						<div />
					)
				}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
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
				type Props = {
					ref: Ref
					key: string
				}
				type SecondProps = {
					ref: Ref
					key: string
				}
				type ThirdProps = SecondProps & {
					ref: Ref
					key: string
				}
        function C(props: Props) {
					return (
						<div
							ref=""
							key=""
						/>
					)
				}
				`,
				output: `
				type Props = {
					key: string
					ref: Ref
				}
				type SecondProps = {
					key: string
					ref: Ref
				}
				type ThirdProps = SecondProps & {
					key: string
					ref: Ref
				}
        function C(props: Props) {
					return (
						<div
							key=""
							ref=""
						/>
					)
				}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 3,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 7,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 11,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 17,
					},
				],
			},
			{
				code: `
        function C(props: {
					ref: Ref
					key: string
				}) {
					return (
						<div
							ref=""
							key=""
						/>
					)
				}
				`,
				output: `
        function C(props: {
					key: string
					ref: Ref
				}) {
					return (
						<div
							key=""
							ref=""
						/>
					)
				}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 3,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 8,
					},
				],
			},
			{
				code: `
				type Props = {
					key: string
					onClick: () => void
					everythingElse: string
					onChange: () => void
					somethingElse: string
					className: string
				}
        function C(props: Props) {
					return (
						<div
							key=""
							onClick=""
							everythingElse=""
							{...props}
							onChange=""
							somethingElse=""
							className=""
						/>
					)
				}
				`,
				output: `
				type Props = {
					key: string
					className: string
					everythingElse: string
					somethingElse: string
					onClick: () => void
					onChange: () => void
				}
        function C(props: Props) {
					return (
						<div
							key=""
							everythingElse=""
							onClick=""
							{...props}
							className=""
							somethingElse=""
							onChange=""
						/>
					)
				}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the prop `className` to be sorted here',
						line: 4,
					},
					{
						message: 'Expected the prop `everythingElse` to be sorted here',
						line: 14,
					},
					{
						message: 'Expected the prop `className` to be sorted here',
						line: 17,
					},
				],
			},
			{
				code: `
				type Props = {
					// Comment 1
					// Comment 2
					ref: string; // Comment 3
					/**
					 * Comment 4
					 */
					key: string // Comment 5
					// Comment 6
				}
				`,
				output: `
				type Props = {
					/**
					 * Comment 4
					 */
					key: string; // Comment 5
					// Comment 1
					// Comment 2
					ref: string // Comment 3
					// Comment 6
				}
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 5,
					}
				]
			},
			{
				code: `
				type Props = { ref: string; key: string }
				`,
				output: `
				type Props = { key: string; ref: string }
				`,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 2,
					}
				]
			},
		],
	},
}
