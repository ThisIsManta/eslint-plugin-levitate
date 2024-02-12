/// <reference path="../types.d.ts" />
// @ts-check

const fp = require('path')
const _ = require('lodash')

/**
 * @type {RuleModule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing React components consistently',
		},
		fixable: 'code',
	},
	create: function (context) {
		const componentName = _.startCase(
			fp
				.basename(context.filename)
				.replace(/\..+/, '')
		).replace(/\s/g, '')

		let defaultExportNode = null
		let topLevelDeclarations = []
		let primaryComponentNode = null
		let primaryComponentIsUsed = false

		/**
		 * @param {WithParent<ES.Identifier>} root
		 */
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

				const reactImport = root.body.reduce((output, node) => {
					if (
						node.type === 'ImportDeclaration' &&
						node.source.type === 'Literal' &&
						node.source.value === 'react' &&
						node.specifiers.length > 0
					) {
						return {
							Default: node.specifiers.find(specifier =>
								_.isMatch(specifier, { type: 'ImportDefaultSpecifier' })
							)?.local.name,
							Component: node.specifiers.find(specifier =>
								_.isMatch(specifier, { type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'Component' } })
							)?.local.name,
							PureComponent: node.specifiers.find(specifier =>
								_.isMatch(specifier, { type: 'ImportSpecifier', imported: { type: 'Identifier', name: 'PureComponent' } })
							)?.local.name,
						}

					} else if (node.type === 'VariableDeclaration') {
						for (const stub of node.declarations) {
							if (
								_.isMatch(stub, { type: 'VariableDeclarator', init: { type: 'CallExpression', callee: { type: 'Identifier', name: 'require' }, arguments: [{ type: 'Literal', value: 'react' }] } })
							) {
								if (stub.id.type === 'Identifier') {
									output.Default = stub.id.name

								} else if (stub.id.type === 'ObjectPattern') {
									for (const propertyNode of stub.id.properties) {
										if (
											propertyNode.type === 'Property' &&
											propertyNode.key.type === 'Identifier' &&
											propertyNode.value.type === 'Identifier'
										) {
											if (propertyNode.key.name === 'Component') {
												output.Component = propertyNode.value.name

											} else if (propertyNode.key.name === 'PureComponent') {
												output.PureComponent = propertyNode.value.name
											}
										}
									}
								}
							}
						}
					}

					return output
				}, /** @type {Partial<{ Default: string, Component: string, PureComponent: string }>} */({}))

				topLevelDeclarations = _.chain(root.body)
					.map(/** @return {ES.Node} */(node) => {
						if (
							(node.type === 'ExportDefaultDeclaration' || node.type === 'ExportNamedDeclaration') &&
							node.declaration
						) {
							return /** @type {ES.Node} */ (node.declaration)
						}

						return node
					})
					.flatMap(node => context.sourceCode.getDeclaredVariables(node))
					.flatMap(({ name, defs }) => defs.map(({ type, node }) => ({ name, type, node })))
					.uniqBy(definition => definition.node)
					.value()

				for (const { name, type, node } of topLevelDeclarations) {
					if (name === componentName) {
						if (type === 'FunctionName') {
							primaryComponentNode = node
						}

						if (
							type === 'ClassName' &&
							node.type === 'ClassDeclaration' &&
							node.superClass &&
							(
								// Match `class ... extends React.[Component|PureComponent]`
								reactImport.Default &&
								_.isMatch(node.superClass, { type: 'MemberExpression', object: { type: 'Identifier', name: reactImport.Default }, property: { type: 'Identifier' } }) &&
								(node.superClass.property.name === 'Component' || node.superClass.property.name === 'PureComponent') ||

								// Match `class ... extends Component`
								reactImport.Component && _.isMatch(node.superClass, { type: 'Identifier', name: reactImport.Component }) ||

								// Match `class ... extends PureComponent`
								reactImport.PureComponent && _.isMatch(node.superClass, { type: 'Identifier', name: reactImport.PureComponent })
							)
						) {
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
				const firstToken = context.sourceCode.getFirstToken(root)
				if (!firstToken) {
					return
				}

				if (!primaryComponentNode) {
					return context.report({
						loc: firstToken.loc,
						message: `Expected to have a React component named "${componentName}"`,
					})
				}

				const componentToken = context.sourceCode.getFirstToken(primaryComponentNode)
				if (!defaultExportNode && componentToken) {
					return context.report({
						loc: componentToken.loc,
						message: 'Expected `export default` to be here',
					})
				}

				if (defaultExportNode.declaration === primaryComponentNode) {
					return
				}

				// Find `export default MyComponent` and report not having `export default` in front of `class` or `function` keyword
				if (
					defaultExportNode.declaration.type === 'Identifier' &&
					defaultExportNode.declaration.name === componentName &&
					primaryComponentNode.type !== 'VariableDeclarator' &&
					componentToken
				) {
					return context.report({
						loc: componentToken.loc,
						message: 'Expected `export default` to be here',
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
				import React from 'react'
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
				import React from 'react'
				import SomethingElse from 'something-else'
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
				import { Component } from 'react'
				export default class A extends Component {}
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
				import { PureComponent } from 'react'
				export default class A extends PureComponent {}
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
				const React = require('react')
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
				const React = require('react')
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
				const { Component } = require('react')
				export default class A extends Component {}
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
				const { PureComponent } = require('react')
				export default class A extends PureComponent {}
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
			{
				code: `
				export const A = React.memo(() => { return <div></div> })
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
						message: 'Expected to have a React component named "A"',
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
						message: 'Expected to have a React component named "A"',
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
						message: 'Expected `export default` to be here',
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
						message: 'Expected `export default` to be here',
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
						message: 'Expected `export default` to be here',
						line: 2,
						column: 12,
					},
				],
			},
		],
	},
}

/**
 * @param {ES.Function | null | undefined} node
 * @return {boolean}
 */
function isReactFunctionalComponent(node) {
	if (!node) {
		return false
	}

	if (node.type === 'ArrowFunctionExpression' && node.expression) {
		const type = /** @type {string} */ (node.body.type)
		return type === 'JSXElement' || type === 'JSXFragment'
	}

	return (
		node.body &&
		node.body.type === 'BlockStatement' &&
		node.body.body.some(stub =>
			stub.type === 'ReturnStatement' &&
			stub.argument && (
				/** @type {string} */(stub.argument.type) === 'JSXElement' ||
				/** @type {string} */(stub.argument.type) === 'JSXFragment'
			)
		)
	)
}
