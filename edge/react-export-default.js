const path = require('path')
const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing React components consistently',
		},
		fixable: 'code',
	},
	create: function (context) {
		const componentName = path
			.basename(context.getFilename())
			.replace(FILE_SUFFIX, '')

		const COMPONENT_NAME = {
			type: 'Identifier',
			name: componentName,
		}

		let primaryComponentNode = null
		let defaultExportNode = null

		return {
			FunctionDeclaration: function (root) {
				if (_.isMatch(root.id, COMPONENT_NAME)) {
					primaryComponentNode = root
				}
			},
			ClassDeclaration: function (root) {
				if (
					_.isMatch(root, CLASS_COMPONENT) &&
					_.isMatch(root.id, COMPONENT_NAME)
				) {
					primaryComponentNode = root
				}
			},
			ExportDefaultDeclaration: function (root) {
				defaultExportNode = root.declaration
			},
			Program: function (root) {
				for (const statement of root.body) {
					if (statement.type !== 'VariableDeclaration') {
						continue
					}

					for (const node of statement.declarations) {
						if (node.type !== 'VariableDeclarator' || !node.init) {
							continue
						}

						if (isReactFunctionalComponent(node.init)) {
							context.report({
								node: node.init,
								message:
									'Expected a React component to be written using `function` keyword (if possible)',
							})
						}
					}
				}
			},
			'Program:exit': function (root) {
				if (!primaryComponentNode) {
					return context.report({
						node: context.getSourceCode().getFirstToken(root),
						message: `Expected the React file to have a React component named "${componentName}"`,
					})
				}

				if (!defaultExportNode) {
					return context.report({
						node: context.getSourceCode().getFirstToken(root),
						message: 'Expected the React file to have `export default` keyword',
					})
				}

				if (defaultExportNode === primaryComponentNode) {
					return
				}

				if (_.isMatch(defaultExportNode, COMPONENT_NAME)) {
					return context.report({
						loc: {
							start: primaryComponentNode.loc.start,
							end: {
								line: primaryComponentNode.loc.start.line,
								column: primaryComponentNode.loc.start.column,
							},
						},
						message: `Expected \`export default\` keyword to be here`,
					})
				}

				// Skip checking
				// `export default enhance(MyComponent)`
				// `export default (props) => <MyComponent {...props} />`
				const primaryComponentUsed = findNode(
					defaultExportNode,
					node =>
						_.isMatch(node, COMPONENT_NAME) ||
						_.isMatch(node, { type: 'JSXIdentifier', name: componentName }),
					[],
					new Set([defaultExportNode.parent])
				)
				if (!primaryComponentUsed) {
					context.report({
						node: defaultExportNode,
						message: `Expected an enhanced component to render the React component named "${componentName}"`,
					})
				}

				if (
					defaultExportNode.type === 'FunctionDeclaration' ||
					defaultExportNode.type === 'ClassDeclaration'
				) {
					context.report({
						node: defaultExportNode,
						message: `Expected an enhanced component to be nameless by writing as an arrow function`,
					})
				}

				if (
					defaultExportNode.type === 'ArrowFunctionExpression' &&
					defaultExportNode.body.type === 'BlockStatement' &&
					defaultExportNode.body.body.length === 1 &&
					defaultExportNode.body.body[0].type === 'ReturnStatement'
				) {
					// Do not early return
					context.report({
						node: defaultExportNode.body.body[0],
						message:
							'Expected the arrow function to return the value without `return` keyword',
						fix: fixer =>
							fixer.replaceText(
								defaultExportNode.body,
								context
									.getSourceCode()
									.getText(defaultExportNode.body.body[0].argument)
							),
					})
				}
			},
		}
	},
	tests: {
		valid: [
			{
				code: `
				const x = 123
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				const Y = function () { return false }
				export default function A() { return <div></div> }
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				export default B
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				export default class A extends React.Component {}
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				export default class A extends React.PureComponent {}
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default enhance(A)
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default (props) => <A />
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				export default function A(props) { return <div></div> }
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				export function A(props) { return <div></div> }
				export default () => <A />
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				export default function A(props) {
					const renderSomething = () => (
						<div></div>
					)
					return <div>{renderSomething()}</div>
				}
				`,
				filename: 'A.react.js',
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
				const x = 123
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message:
							'Expected the React file to have a React component named "A"',
					},
				],
			},
			{
				code: `
				const X = function () { return <div></div> }
				const Y = () => { return <div></div> }
				const Z = () => <div></div>
				export default function A() { return <div></div> }
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message:
							'Expected a React component to be written using `function` keyword (if possible)',
						line: 2,
					},
					{
						message:
							'Expected a React component to be written using `function` keyword (if possible)',
						line: 3,
					},
					{
						message:
							'Expected a React component to be written using `function` keyword (if possible)',
						line: 4,
					},
				],
			},
			{
				code: `
				export default (props) => <div></div>
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message:
							'Expected the React file to have a React component named "A"',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default (props) => { return <A /> }
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message:
							'Expected the arrow function to return the value without `return` keyword',
						output: `
						function A(props) { return <div></div> }
						export default (props) => <A />
						`,
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default A
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected `export default` keyword to be here',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default class B extends React.Component {}
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message:
							'Expected an enhanced component to render the React component named "A"',
					},
					{
						message:
							'Expected an enhanced component to be nameless by writing as an arrow function',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default class B extends React.PureComponent { render() { return <A /> } }
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message:
							'Expected an enhanced component to be nameless by writing as an arrow function',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default function B(props) {}
				`,
				filename: 'A.react.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message:
							'Expected an enhanced component to render the React component named "A"',
					},
					{
						message:
							'Expected an enhanced component to be nameless by writing as an arrow function',
					},
				],
			},
		],
	},
}

const CLASS_COMPONENT = {
	type: 'ClassDeclaration',
	superClass: {
		type: 'MemberExpression',
		object: {
			type: 'Identifier',
			name: 'React',
		},
		property: {
			type: 'Identifier',
		},
	},
}

function isReactFunctionalComponent(node) {
	if (!node) {
		return false
	}

	if (node.type === 'ArrowFunctionExpression' && node.expression) {
		return node.body.type === 'JSXElement' || node.body.type === 'JSXFragment'
	}

	return (
		node.body &&
		node.body.type === 'BlockStatement' &&
		node.body.body.some(
			stub =>
				stub.type === 'ReturnStatement' &&
				(stub.argument.type === 'JSXElement' ||
					stub.argument.type === 'JSXFragment')
		)
	)
}

function findNode(sourceNode, matcher, parentNodes = [], visitedNodes = new Set()) {
	if (visitedNodes.has(sourceNode)) {
		return null
	} else {
		visitedNodes.add(sourceNode)
	}

	if (_.isObject(sourceNode)) {
		if (matcher(sourceNode, parentNodes)) {
			return sourceNode
		}

		parentNodes = parentNodes.concat(sourceNode)

		for (const name in sourceNode) {
			if (name === 'loc' || name === 'range') {
				continue
			}
			const matchingNode = findNode(
				sourceNode[name],
				matcher,
				parentNodes,
				visitedNodes
			)
			if (matchingNode !== null) {
				return matchingNode
			}
		}
	} else if (_.isArrayLike(sourceNode)) {
		parentNodes = parentNodes.concat(sourceNode)

		for (const rank of sourceNode) {
			const matchingNode = findNode(
				sourceNode[rank],
				matcher,
				parentNodes,
				visitedNodes
			)
			if (matchingNode !== null) {
				return matchingNode
			}
		}
	}

	return null
}
