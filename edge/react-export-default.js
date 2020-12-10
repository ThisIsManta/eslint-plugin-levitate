const path = require('path')
const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce writing React components consistently',
		},
	},
	create: function (context) {
		const componentName = path
			.basename(context.getFilename())
			.replace(/\..+/, '')

		const componentId = {
			type: 'Identifier',
			name: componentName,
		}

		let primaryComponentNode = null
		let defaultExportNode = null

		return {
			ExportDefaultDeclaration: function (root) {
				defaultExportNode = root.declaration

				if (checkReactMemo(root.declaration, componentName)) {
					primaryComponentNode = root.declaration
				}
			},
			Program: function (root) {
				const topLevelNodes = root.body.map(node => {
					if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') && node.declaration) {
						return node.declaration
					}

					return node
				})

				for (const node of topLevelNodes) {
					if (_.isMatch(node.id, componentId) && (_.isMatch(node, { type: 'FunctionDeclaration' }) || _.isMatch(node, CLASS_COMPONENT))) {
						primaryComponentNode = node
					}

					if (node.type === 'VariableDeclaration') {
						for (const stub of node.declarations) {
							if (_.isMatch(stub, { type: 'VariableDeclarator', id: { type: 'Identifier' } })) {
								const name = stub.id.name
								if (name === componentName) {
									primaryComponentNode = stub
								}

								if (stub.init && (stub.init.type === 'ArrowFunctionExpression' || stub.init.type === 'FunctionExpression') && isReactFunctionalComponent(stub.init, name)) {
									context.report({
										node: stub,
										message: 'Expected a React component to be written using `function` keyword',
									})
								}

								checkReactMemo(stub.init, name)
							}
						}
					}
				}
			},
			'Program:exit': function (root) {
				// Skip an empty file
				const firstNode = context.getSourceCode().getFirstToken(root)
				if (!firstNode) {
					return
				}

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

				// Find `export default MyComponent` and report not having `export default` in front of `class` or `function` keyword
				if (
					_.isMatch(defaultExportNode, componentId) &&
					primaryComponentNode.type !== 'VariableDeclarator'
				) {
					return context.report({
						node: context.getSourceCode().getFirstToken(primaryComponentNode),
						message: 'Expected `export default` keyword to be here',
					})
				}

				// Skip checking
				// `export default enhance(MyComponent)`
				// `export default (props) => <MyComponent {...props} />`
				const primaryComponentUsed = findNode(
					defaultExportNode,
					node =>
						_.isMatch(node, componentId) ||
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
						message: 'Expected the arrow function to return the value without `return` keyword',
					})
				}
			},
		}

		function checkReactMemo(node, name) {
			if (_.isMatch(node, {
				type: 'CallExpression',
				callee: {
					type: 'MemberExpression',
					object: { type: 'Identifier', name: 'React' },
					property: { type: 'Identifier', name: 'memo' },
				},
			}) && node.arguments.length > 0 && isReactFunctionalComponent(node.arguments[0])) {
				if (node.arguments[0].type === 'ArrowFunctionExpression') {
					context.report({
						node: node.arguments[0],
						message: 'Expected a React component to be written using `function` keyword',
					})

				} else if (node.arguments[0].type === 'FunctionExpression' && (node.arguments[0].id ? node.arguments[0].id.name : '') !== name) {
					context.report({
						node: node.arguments[0].id || node.arguments[0],
						message: `Expected the React component to be named "${name}"`,
					})

				} else {
					return true
				}
			}

			return false
		}
	},
	tests: {
		valid: [
			{
				code: `
				const Y = function () { return false }
				export default function A() { return <div></div> }
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
				filename: 'A.js',
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
				filename: 'A.js',
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
				filename: 'A.js',
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
				filename: 'A.js',
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
				filename: 'A.js',
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
				filename: 'A.js',
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
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
			},
			{
				code: `
				export default () => <A />
				const A = React.memo(function A() { return <div></div> })
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
				export default React.memo(function A() { return <div></div> })
				`,
				filename: 'A.js',
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
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the React file to have a React component named "A"',
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
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected a React component to be written using `function` keyword',
						line: 2,
					},
					{
						message: 'Expected a React component to be written using `function` keyword',
						line: 3,
					},
					{
						message: 'Expected a React component to be written using `function` keyword',
						line: 4,
					},
				],
			},
			{
				code: `
				export default (props) => <div></div>
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the React file to have a React component named "A"',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default (props) => { return <A /> }
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the arrow function to return the value without `return` keyword',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default A
				`,
				filename: 'A.js',
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
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected an enhanced component to render the React component named "A"',
					},
					{
						message: 'Expected an enhanced component to be nameless by writing as an arrow function',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default class B extends React.PureComponent { render() { return <A /> } }
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected an enhanced component to be nameless by writing as an arrow function',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default function B(props) {}
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected an enhanced component to render the React component named "A"',
					},
					{
						message: 'Expected an enhanced component to be nameless by writing as an arrow function',
					},
				],
			},
			{
				code: `
        export default () => <A />
        const A = React.memo(() => { return <div></div> })
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected a React component to be written using `function` keyword',
					},
				],
			},
			{
				code: `
        export default () => <A />
        const A = React.memo(function () { return <div></div> })
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected the React component to be named "A"',
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
				stub.argument &&
				(stub.argument.type === 'JSXElement' ||
					stub.argument.type === 'JSXFragment')
		)
	)
}

function findNodes(sourceNode, matcher) {
	const matchingNodes = []
	travelNodes(sourceNode, matcher, matchingNodes)
	return matchingNodes
}

module.exports.findNode = findNode

function findNode(sourceNode, matcher) {
	const matchingNodes = []
	travelNodes(sourceNode, matcher, matchingNodes)
	return matchingNodes[0] || null
}

module.exports.findNodes = findNodes

/**
 * @internal
 */
function travelNodes(sourceNode, matcher, matchingNodes, parentNodes = [], visitedNodes = new Set()) {
	if (visitedNodes.has(sourceNode)) {
		return
	} else {
		visitedNodes.add(sourceNode)
	}

	if (_.isObject(sourceNode)) {
		if (matcher(sourceNode, parentNodes)) {
			matchingNodes.push(sourceNode)
		}

		parentNodes = parentNodes.concat(sourceNode)

		for (const name in sourceNode) {
			if (name === 'parent') {
				continue
			}

			travelNodes(
				sourceNode[name],
				matcher,
				matchingNodes,
				parentNodes,
				visitedNodes
			)
		}
	} else if (_.isArrayLike(sourceNode)) {
		parentNodes = parentNodes.concat(sourceNode)

		for (const rank of sourceNode) {
			travelNodes(
				sourceNode[rank],
				matcher,
				matchingNodes,
				parentNodes,
				visitedNodes
			)
		}
	}
}
