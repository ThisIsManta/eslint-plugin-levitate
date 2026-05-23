// @ts-check

import { defineRule } from '@oxlint/plugins'
import fp from 'path'
import _ from 'lodash'

export default defineRule({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing React components consistently',
		},
		fixable: 'code',
	},
	createOnce(context) {
		let componentName = ''

		/**
		 * @type {import('@oxlint/plugins').ESTree.ExportDefaultDeclaration | undefined}
		 */
		let defaultExportNode = undefined

		/**
		 * @type {Array<{ name: string, type: import('@oxlint/plugins').DefinitionType, node: import('@oxlint/plugins').ESTree.Node }>}
		 */
		let topLevelDeclarations = []

		/**
		 * @type {import('@oxlint/plugins').ESTree.Node | undefined}
		 */
		let primaryComponentNode = undefined

		let primaryComponentIsUsed = false

		/**
		 * @param {Pick<import('@oxlint/plugins').ESTree.BindingIdentifier, 'name' | 'parent'>} node
		 */
		function setIfPrimaryComponentIsUsed(node) {
			if (node.name !== componentName) {
				return
			}

			if (defaultExportNode) {
				/**
				 * @type {import('@oxlint/plugins').ESTree.Node | null}
				 */
				let stub = node.parent
				while (stub) {
					if (stub === defaultExportNode) {
						primaryComponentIsUsed = true
						break
					}
					stub = stub.parent
				}
			}
		}

		return {
			before() {
				componentName = _.startCase(
					fp
						.basename(context.filename)
						.replace(/\..+/, '')
				).replace(/\s/g, '')

				defaultExportNode = undefined

				topLevelDeclarations = []

				primaryComponentNode = undefined

				primaryComponentIsUsed = false
			},
			Program(root) {
				defaultExportNode = root.body.find(node => node.type === 'ExportDefaultDeclaration')

				const reactImport = root.body.reduce((/** @type {Partial<{ Default: string, Component: string, PureComponent: string }>} */output, node) => {
					if (
						node.type === 'ImportDeclaration' &&
						node.source.type === 'Literal' &&
						node.source.value === 'react' &&
						node.specifiers.length > 0
					) {
						return {
							Default: node.specifiers.find(specifier =>
								specifier.type === 'ImportDefaultSpecifier'
							)?.local.name,
							Component: node.specifiers.find(specifier =>
								specifier.type === 'ImportSpecifier' &&
								specifier.imported.type === 'Identifier' &&
								specifier.imported.name === 'Component'
							)?.local.name,
							PureComponent: node.specifiers.find(specifier =>
								specifier.type === 'ImportSpecifier' &&
								specifier.imported.type === 'Identifier' &&
								specifier.imported.name === 'PureComponent'
							)?.local.name,
						}

					} else if (node.type === 'VariableDeclaration') {
						for (const stub of node.declarations) {
							if (
								stub.type === 'VariableDeclarator' &&
								stub.init?.type === 'CallExpression' &&
								stub.init.callee.type === 'Identifier' &&
								stub.init.callee.name === 'require' &&
								stub.init.arguments[0]?.type === 'Literal' &&
								stub.init.arguments[0]?.value === 'react'
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
				}, {})

				topLevelDeclarations = _.chain(root.body)
					.map(node => {
						if (
							(node.type === 'ExportDefaultDeclaration' || node.type === 'ExportNamedDeclaration') &&
							node.declaration
						) {
							return node.declaration
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
								node.superClass.type === 'MemberExpression' &&
								node.superClass.object.type === 'Identifier' &&
								node.superClass.object.name === reactImport.Default &&
								node.superClass.property.type === 'Identifier' &&
								(node.superClass.property.name === 'Component' || node.superClass.property.name === 'PureComponent') ||

								// Match `class ... extends Component`
								(reactImport.Component && node.superClass.type === 'Identifier' && node.superClass.name === reactImport.Component) ||

								// Match `class ... extends PureComponent`
								(reactImport.PureComponent && node.superClass.type === 'Identifier' && node.superClass.name === reactImport.PureComponent)
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
							'init' in node && node.init &&
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
			Identifier(root) {
				if (
					root.parent?.type === 'CallExpression' &&
					root.parent.arguments[0] === root
				) {
					setIfPrimaryComponentIsUsed(root)
				}
			},
			JSXIdentifier(root) {
				setIfPrimaryComponentIsUsed(root)
			},
			FunctionExpression(root) {
				if (!isReactFunctionalComponent(root)) {
					return
				}

				if (
					root.parent &&
					root.parent.type === 'CallExpression' &&
					root.parent.arguments.includes(root)
				) {
					context.report({
						node: root,
						message: 'Expected a React component argument to be written as an arrow function',
					})
				}
			},
			'Program:exit'(root) {
				// Skip an empty file
				const firstToken = context.sourceCode.getFirstToken(root)
				if (!firstToken) {
					return
				}

				if (!primaryComponentNode) {
					context.report({
						loc: firstToken.loc,
						message: `Expected to have a React component named "${componentName}"`,
					})
					return
				}

				const componentToken = context.sourceCode.getFirstToken(primaryComponentNode)
				if (!componentToken) {
					// Note that this should never happen but it is here for compile-time type checking only
					return
				}

				if (!defaultExportNode) {
					context.report({
						loc: componentToken.loc,
						message: 'Expected `export default` to be here',
					})
					return
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
					const a = primaryComponentNode
					const b = defaultExportNode
					context.report({
						loc: componentToken.loc,
						message: 'Expected `export default` to be here',
						fix: primaryComponentNode.parent?.type === 'ExportNamedDeclaration' ? undefined : fixer => [
							fixer.insertTextBefore(a, 'export default '),
							fixer.removeRange(b.range),
						]
					})
					return
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
	}
})

/**
 * @param {import('@oxlint/plugins').ESTree.Function | import('@oxlint/plugins').ESTree.ArrowFunctionExpression | null | undefined} node
 * @return {boolean}
 */
function isReactFunctionalComponent(node) {
	if (!node) {
		return false
	}

	if (node.type === 'ArrowFunctionExpression' && node.expression) {
		return node.body.type === 'JSXElement' || node.body.type === 'JSXFragment'
	}

	return (
		!!node.body &&
		node.body.type === 'BlockStatement' &&
		node.body.body.some(stub =>
			stub.type === 'ReturnStatement' &&
			stub.argument && (
				stub.argument.type === 'JSXElement' ||
				stub.argument.type === 'JSXFragment'
			)
		)
	)
}
