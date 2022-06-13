const path = require('path')
const _ = require('lodash')

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing React components consistently',
		},
		fixable: 'code',
	},
	create: function (context) {
		const componentName = path
			.basename(context.getFilename())
			.replace(/\..+/, '')

		const componentId = {
			type: 'Identifier',
			name: componentName,
		}

		let defaultExportNode = null
		let topLevelDeclarations = []
		let primaryComponentNode = null
		let primaryComponentIsUsed = false

		function setIfPrimaryComponentIsUsed(root) {
			if (root.name !== componentName) {
				return
			}

			if (defaultExportNode) {
				let node = root.parent
				while (node) {
					if (node === defaultExportNode) {
						primaryComponentIsUsed = true
						break
					}
					node = node.parent
				}
			}
		}

		return {
			Program: function (root) {
				defaultExportNode = root.body.find(node => node.type === 'ExportDefaultDeclaration')

				topLevelDeclarations = _.chain(root.body)
					.map(node => {
						if (node.type === 'ExportDefaultDeclaration' || node.type === 'ExportNamedDeclaration') {
							return node.declaration
						}

						return node
					})
					.flatMap(node => context.getDeclaredVariables(node))
					.flatMap(({ name, defs }) => defs.map(({ type, node }) => ({ name, type, node })))
					.uniqBy(definition => definition.node)
					.value()

				for (const { name, type, node } of topLevelDeclarations) {
					if (name === componentName) {
						if (type === 'FunctionName') {
							primaryComponentNode = node
						}

						if (type === 'ClassName' && _.isMatch(node, CLASS_COMPONENT)) {
							primaryComponentNode = node
						}

						if (type === 'Variable') {
							primaryComponentNode = node
						}
					}

					if (type === 'Variable') {
						if (
							node.init &&
							(node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression') &&
							isReactFunctionalComponent(node.init)
						) {
							context.report({
								node: node,
								message: 'Expected the React component to be written as `function ' + name + '(props) {...}`',
							})
						}
					}
				}
			},
			Identifier: function (root) {
				if (_.isMatch(root.parent, { type: 'CallExpression', arguments: [root] })) {
					setIfPrimaryComponentIsUsed(root)
				}
			},
			JSXIdentifier: setIfPrimaryComponentIsUsed,
			FunctionExpression: function (root) {
				if (!isReactFunctionalComponent(root)) {
					return
				}

				if (root.parent && root.parent.type === 'CallExpression' && root.parent.arguments.includes(root)) {
					context.report({
						node: root,
						message: 'Expected a React component argument to be written as an arrow function',
					})
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
						node: firstNode,
						message: `Expected the React file to have \`function ${componentName}\` or \`class ${componentName}\` outside \`React.memo\` or any other enhanced functions`,
					})
				}

				if (!defaultExportNode) {
					return context.report({
						node: firstNode,
						message: 'Expected a React file to have `export default` keyword',
					})
				}

				if (defaultExportNode.declaration === primaryComponentNode) {
					return
				}

				// Find `export default MyComponent` and report not having `export default` in front of `class` or `function` keyword
				if (
					_.isMatch(defaultExportNode.declaration, componentId) &&
					primaryComponentNode.type !== 'VariableDeclarator'
				) {
					return context.report({
						node: context.getSourceCode().getFirstToken(primaryComponentNode),
						message: 'Expected `export default` keyword to be here',
						fix: primaryComponentNode.parent.type === 'ExportNamedDeclaration' ? undefined : fixer => [
							fixer.insertTextBefore(primaryComponentNode, 'export default '),
							fixer.removeRange(defaultExportNode.range),
						]
					})
				}

				// Skip reporting `export default enhance(MyComponent)`
				// Skip reporting `export default (props) => <MyComponent {...props} />`
				if (!primaryComponentIsUsed) {
					context.report({
						node: defaultExportNode.declaration,
						message: `Expected an enhanced component to render the React component named "${componentName}"`,
					})
				}

				if (
					defaultExportNode.declaration.type === 'FunctionDeclaration' ||
					defaultExportNode.declaration.type === 'ClassDeclaration'
				) {
					context.report({
						node: defaultExportNode.declaration,
						message: `Expected an enhanced component to be written as an arrow function`,
					})
				}

				if (
					defaultExportNode.declaration.type === 'ArrowFunctionExpression' &&
					defaultExportNode.declaration.body.type === 'BlockStatement' &&
					defaultExportNode.declaration.body.body.length === 1 &&
					defaultExportNode.declaration.body.body[0].type === 'ReturnStatement'
				) {
					// Do not early return
					context.report({
						node: defaultExportNode.declaration.body.body[0],
						message: 'Expected the arrow function to return the value by using the shorthand syntax',
					})
				}
			},
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
				const A = React.memo(() => <div></div>)
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
				function A() { return <div></div> }
				export default React.memo(() => { return <A/> })
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
				const A = React.memo(() => { return <div></div> })
				export default () => <A />
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
						message: 'Expected the React file to have `function A` or `class A` outside `React.memo` or any other enhanced functions',
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
						message: 'Expected the React component to be written as `function X(props) {...}`',
						line: 2,
					},
					{
						message: 'Expected the React component to be written as `function Y(props) {...}`',
						line: 3,
					},
					{
						message: 'Expected the React component to be written as `function Z(props) {...}`',
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
						message: 'Expected the React file to have `function A` or `class A` outside `React.memo` or any other enhanced functions',
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
						message: 'Expected the arrow function to return the value by using the shorthand syntax',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected a React file to have `export default` keyword',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default A//EOL
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
				output: `
				export default function A(props) { return <div></div> }
				//EOL
				`,
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
						message: 'Expected an enhanced component to be written as an arrow function',
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
						message: 'Expected an enhanced component to be written as an arrow function',
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
						message: 'Expected an enhanced component to be written as an arrow function',
					},
				],
			},
			{
				code: `
				export default function A(props) { return <div></div> }
				const B = React.memo(function C() { return <div></div> })
				`,
				filename: 'A.js',
				parserOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					ecmaFeatures: { jsx: true },
				},
				errors: [
					{
						message: 'Expected a React component argument to be written as an arrow function',
					},
				],
			},
			{
				code: `
				export function A(props) { return <div></div> }
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
