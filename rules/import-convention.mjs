// @ts-check

import _ from 'lodash'
import fs from 'fs'
import fp from 'path'
import ts from 'typescript'

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce naming imported identifiers after the user-defined list',
		},
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					path: { type: 'string' },
				},
				additionalProperties: {
					default: { anyOf: [{ type: 'boolean' }, { type: 'string' }] },
					namespace: { anyOf: [{ type: 'boolean' }, { type: 'string' }] },
					named: {
						anyOf: [
							{ type: 'boolean' },
							{
								type: 'array', items: {
									type: 'object',
									properties: {
										name: { type: 'string' },
									},
									additionalProperties: {
										rename: { type: 'string' },
										forbidden: { type: 'boolean' },
									}
								}
							}
						]
					}
				}
			}
		},
	},
	create(context) {
		const rules = context.options.map(({ path, named, ...rest }) => ({
			...rest,
			path: new RegExp(path),
			named: Array.isArray(named)
				? named.map(({ name, ...rest }) => ({ ...rest, name: new RegExp(name) }))
				: named
		}))

		/**
		 * @param {Object} options
		 * @param {import('estree').Node} options.root
		 * @param {string} options.modulePath
		 * @param {import('estree').Identifier} [options.namespaceNode]
		 * @param {import('estree').Identifier} [options.defaultNode]
		 * @param {Array<{ originalNode: import('estree').Identifier, givenNode?: import('estree').Identifier }>} [options.namedWrappers]
		 */
		function check({ root, modulePath, namespaceNode, defaultNode, namedWrappers }) {
			const rule = rules.find(({ path }) => path.test(modulePath))
			if (!rule) {
				return
			}

			if (namespaceNode) {
				if (rule.namespace === false) {
					context.report({
						node: namespaceNode,
						message: `Unexpected the namespace import.`,
					})
				}

				const actualName = namespaceNode.name
				const expectedName = normalizeIdentifierName(
					typeof rule.namespace === 'string'
						? modulePath.replace(rule.path, rule.namespace)
						: actualName
				)
				if (actualName !== expectedName) {
					context.report({
						node: namespaceNode,
						message: `Expected the namespace import to be "${expectedName}".`,
					})
				}

				// Stop processing since importing namespace cannot co-exist with other imports
				return

			} else if (rule.namespace === true && !rule.default) {
				context.report({
					node: root,
					message: `Expected the namespace import.`,
				})
				return
			}

			if (defaultNode) {
				if (rule.default === false) {
					context.report({
						node: defaultNode,
						message: `Unexpected the default import.`,
					})
				}

				const actualName = defaultNode.name
				const expectedName = normalizeIdentifierName((() => {
					if (typeof rule.default === 'string') {
						return modulePath.replace(rule.path, rule.default)
					}

					if (
						rule.default === true &&
						!modulePath.startsWith('.') &&
						!modulePath.startsWith('/') &&
						context.parserPath &&
						context.parserPath.includes('@typescript-eslint/parser'.replace('/', fp.sep))
					) {
						try {
							const name = findType(modulePath, fp.dirname(context.filename))
							if (name) {
								return name
							}
						} catch {
							// Do nothing
						}
					}

					return actualName
				})())
				if (actualName !== expectedName) {
					context.report({
						node: defaultNode,
						message: `Expected the default import to be "${expectedName}".`,
					})
				}

				// Forbid writing `default.xxx` where `xxx` is in named import list
				if ((rule.named === true || Array.isArray(rule.named)) && 'parent' in defaultNode) {
					const parentNode = /** @type {import('estree').Node} */ (defaultNode.parent)
					const accessors = _.compact(
						context.sourceCode.getDeclaredVariables(parentNode)[0].references
							.map((node) => {
								const identifier = /** @type {import('eslint').Rule.Node} */ (node.identifier)
								return (
									identifier.parent.type === 'MemberExpression' &&
									identifier.parent.property.type === 'Identifier'
								) ? identifier.parent.property : null
							})
					)

					for (const accessor of accessors) {
						if (rule.named === true) {
							context.report({
								node: accessor,
								message: `Expected "${accessor.name}" to be imported directly.`,
							})
							continue
						}

						const subrule = rule.named.find(({ name }) => name.test(accessor.name))
						if (subrule && !subrule.forbidden) {
							context.report({
								node: accessor,
								message: `Expected "${accessor.name}" to be imported directly.`,
							})
						}
					}
				}

			} else if (rule.default === true) {
				context.report({
					node: root,
					message: `Expected the default import.`,
				})
			}

			if (Array.isArray(namedWrappers) && namedWrappers.length > 0 && rule.named === false) {
				context.report({
					node: root,
					message: `Unexpected any named imports.`,
				})
			}

			if (Array.isArray(namedWrappers) && Array.isArray(rule.named)) {
				for (const { originalNode, givenNode } of namedWrappers) {
					const subrule = rule.named.find(({ name }) => name.test(originalNode.name))

					if (!subrule) {
						continue
					}

					if (subrule.forbidden) {
						context.report({
							node: originalNode,
							message: `Unexpected the named import "${originalNode.name}".`,
						})
						continue
					}

					if (givenNode && givenNode.type === 'Identifier') {
						if (subrule.rename === false && originalNode.name !== givenNode.name) {
							context.report({
								node: givenNode,
								message: `Expected the named import to be "${originalNode.name}".`,
							})
							continue
						}

						const actualName = givenNode.name
						const expectedName = normalizeIdentifierName(
							typeof subrule.rename === 'string'
								? originalNode.name.replace(subrule.name, subrule.rename)
								: originalNode.name
						)
						if (actualName !== expectedName) {
							context.report({
								node: givenNode,
								message: `Expected the named import to be "${expectedName}".`,
							})
						}
					}
				}
			}
		}

		return {
			ImportDeclaration(root) {
				const modulePath = String(root.source.value)
				const namespaceNode = root.specifiers.find((node) => node.type === 'ImportNamespaceSpecifier')
				const defaultNode = root.specifiers.find(/** @return {node is import('estree').ImportDefaultSpecifier} */(node) => node.type === 'ImportDefaultSpecifier')
				const namedNodes = root.specifiers.filter(/** @return {node is import('estree').ImportSpecifier} */(node) => node.type === 'ImportSpecifier')

				check({
					root,
					modulePath,
					namespaceNode: namespaceNode ? namespaceNode.local : undefined,
					defaultNode: defaultNode ? defaultNode.local : undefined,
					namedWrappers: _.compact(
						namedNodes.map(node => node.imported.type === 'Identifier' && ({ originalNode: node.imported, givenNode: node.local }))
					),
				})
			},
			CallExpression(root) {
				if (
					root.callee.type !== 'Identifier' ||
					root.callee.name !== 'require' ||
					root.arguments[0].type !== 'Literal'
				) {
					return
				}

				const modulePath = String(root.arguments[0].value)

				if (root.parent.type === 'VariableDeclarator') {
					if (root.parent.id.type === 'Identifier') {
						check({
							root: root.parent,
							modulePath,
							defaultNode: root.parent.id,
						})
					}

					if (root.parent.id.type === 'ObjectPattern') {
						check({
							root: root.parent,
							modulePath,
							namedWrappers: _.compact(root.parent.id.properties.map((node) =>
								node.type === 'Property' &&
									node.key.type === 'Identifier' &&
									node.value.type === 'Identifier'
									? ({ originalNode: node.key, givenNode: node.value })
									: null
							))
						})
					}
				}

				if (root.parent.type === 'MemberExpression' && root.parent.property.type === 'Identifier') {
					if (root.parent.parent.type === 'VariableDeclarator' && root.parent.parent.id.type === 'Identifier') {
						check({
							root: root.parent,
							modulePath,
							namedWrappers: [{ originalNode: root.parent.property, givenNode: root.parent.parent.id }]
						})

					} else {
						check({
							root: root.parent,
							modulePath,
							namedWrappers: [{ originalNode: root.parent.property }]
						})
					}
				}
			},
		}
	}
}

const findType = _.memoize(
	/**
	 * @param {string} moduleName
	 * @param {string} workingDirectoryPath
	 * @return {string | null}
	 */
	(moduleName, workingDirectoryPath) => {
		const typeDefinitionPath = (() => {
			const directoryParts = _.trim(workingDirectoryPath, fp.sep).split(/\\|\//g)
			for (let index = directoryParts.length; index > 1; index--) {
				const basePath = directoryParts.slice(0, index)

				const directModulePath = fp.join(...basePath, 'node_modules', moduleName)
				if (fs.existsSync(directModulePath) && fs.lstatSync(directModulePath).isDirectory()) {
					const packagePath = fp.join(directModulePath, 'package.json')
					if (fs.existsSync(packagePath)) {
						const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
						if (typeof packageJson.types === 'string') {
							return fp.resolve(directModulePath, packageJson.types)
						}
						if (typeof packageJson.typings === 'string') {
							return fp.resolve(directModulePath, packageJson.typings)
						}
					}
				}

				const typeModulePath = fp.join(...basePath, 'node_modules', '@types', moduleName)
				if (fs.existsSync(typeModulePath) && fs.lstatSync(typeModulePath).isDirectory()) {
					return fp.join(typeModulePath, 'index.d.ts')
				}
			}
		})()

		if (!typeDefinitionPath) {
			return null
		}

		const root = ts.createSourceFile(typeDefinitionPath, fs.readFileSync(typeDefinitionPath, 'utf-8'), ts.ScriptTarget.Latest)

		// Match `declare module "x" {}`
		const scopedModules = _.compact(
			root.statements.map(node =>
				ts.isModuleDeclaration(node) &&
					node.body &&
					ts.isModuleBlock(node.body)
					? node.body
					: null
			)
		)

		const statements = root.statements.concat(...scopedModules.map(node => node.statements))

		// Match `export = X;`
		for (const node of statements) {
			if (
				ts.isExportAssignment(node) &&
				ts.isIdentifier(node.expression) &&
				typeof node.expression.escapedText === 'string'
			) {
				return node.expression.escapedText
			}
		}

		// Match `export as namespace X;`
		for (const node of statements) {
			if (
				ts.isNamespaceExportDeclaration(node) &&
				ts.isIdentifier(node.name) &&
				typeof node.name.escapedText === 'string'
			) {
				return node.name.escapedText
			}
		}

		return null
	},
	(...params) => params.join('|')
)

function normalizeIdentifierName(name) {
	return name
		.trim()
		.replace(/^\d+/, '')
		.split(/-/g)
		.map((word, index) => index === 0 ? word : _.upperFirst(word))
		.join('')
}
