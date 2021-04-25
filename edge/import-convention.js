const _ = require('lodash')
const fs = require('fs')
const fp = require('path')
const glob = require('glob')

module.exports = {
	meta: {
		docs: {
			description: 'enforce naming imported identifiers after the user-defined list',
			category: 'Variables',
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
	create: function (context) {
		const rules = context.options.map(({ path, named, ...rest }) => ({
			...rest,
			path: new RegExp(path),
			named: _.isArray(named)
				? named.map(({ name, ...rest }) => ({ ...rest, name: new RegExp(name) }))
				: named
		}))

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
				const expectedName = typeof rule.namespace === 'string'
					? modulePath.replace(rule.path, rule.namespace)
					: actualName
				if (actualName !== expectedName) {
					context.report({
						node: namespaceNode,
						message: `Expected the namespace import to be "${expectedName}".`,
					})
				}

				// Stop processing since importing namespace cannot co-exist with other imports
				return

			} else if (rule.namespace === true) {
				context.report({
					node: root,
					message: `Expected the namespace import.`,
				})
			}

			if (defaultNode) {
				if (rule.default === false) {
					context.report({
						node: defaultNode,
						message: `Unexpected the default import.`,
					})
				}

				const actualName = defaultNode.name
				const expectedName = (() => {
					if (typeof rule.default === 'string') {
						return modulePath.replace(rule.path, rule.default)
					}

					if (rule.default === true && !modulePath.startsWith('.') && !modulePath.startsWith('/') && context.parserPath.includes('@typescript-eslint/parser'.replace('/', fp.sep))) {
						try {
							const name = findType(modulePath, fp.dirname(context.getFilename()))
							if (name) {
								return name
							}
						} catch {
							// Do nothing
						}
					}

					return actualName
				})()
				if (actualName !== expectedName) {
					context.report({
						node: defaultNode,
						message: `Expected the default import to be "${expectedName}".`,
					})
				}

				// Forbid writing `default.xxx` where `xxx` is in named import list
				if (rule.named === false || _.isArray(rule.named)) {
					const accessors = context.getDeclaredVariables(defaultNode.parent)[0].references
						.filter(node => _.isMatch(node, { identifier: { parent: { type: 'MemberExpression', property: { type: 'Identifier' } } } }))
						.map(node => node.identifier.parent.property)

					for (const accessor of accessors) {
						if (rule.named === false) {
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

			if (_.isArray(namedWrappers) && namedWrappers.length > 0 && rule.named === false) {
				context.report({
					node: root,
					message: `Unexpected any named imports.`,
				})
			}

			if (_.isArray(namedWrappers) && _.isArray(rule.named)) {
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
						const expectedName = typeof subrule.rename === 'string'
							? originalNode.name.replace(subrule.name, subrule.rename)
							: originalNode.name
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
			ImportDeclaration: function (root) {
				const modulePath = root.source.value
				const namespaceNode = root.specifiers.find(node => node.type === 'ImportNamespaceSpecifier')
				const defaultNode = root.specifiers.find(node => node.type === 'ImportDefaultSpecifier')
				const namedNodes = root.specifiers.filter(node => node.type === 'ImportSpecifier')

				check({
					root,
					modulePath,
					namespaceNode: namespaceNode ? namespaceNode.local : undefined,
					defaultNode: defaultNode ? defaultNode.local : undefined,
					namedWrappers: namedNodes.map(node => ({ originalNode: node.imported, givenNode: node.local })),
				})
			},
			CallExpression: function (root) {
				if (!_.isMatch(root, {
					callee: { type: 'Identifier', name: 'require' },
					arguments: [{ type: 'Literal' }]
				})) {
					return
				}

				const modulePath = root.arguments[0].value

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
							namedWrappers: root.parent.id.properties.map(node => ({ originalNode: node.key, givenNode: node.value }))
						})
					}
				}

				if (root.parent.type === 'MemberExpression') {
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
	},
	tests: {
		valid: [
			{
				code: `import XXX from 'xxx'`,
				options: [{ path: 'aaa', default: false }, { path: 'bbb', default: false }],
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', default: true }],
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', default: 'AAA' }],
			},
			{
				code: `import aaa from 'aaa'`,
				options: [{ path: '(.*)', default: '$1' }],
			},
			{
				code: ``,
				options: [{ path: 'aaa', namespace: false }],
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', namespace: true }],
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', namespace: 'AAA' }],
			},
			{
				code: `import * as aaa from 'aaa'`,
				options: [{ path: '(.*)', namespace: '$1' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', named: false }],
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
			},
			{
				code: `import { XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'XXX' }] }],
			},
			{
				code: `import { aaa } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: false }] }],
			},
			{
				code: `import { aaa as AAA } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: 'AAA' }] }],
			},
			{
				code: `import { useState as makeState } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: '^use(\\w+)', rename: 'make$1' }] }],
			},
			{
				code: `import React, { useEffect } from 'react'`,
				options: [{ path: 'react', default: 'React', named: [{ name: /^use\W+/ }] }],
			},
			{
				code: `
					import React from 'react'
					import moment from 'moment'
				`,
				filename: fp.join(__dirname, 'import-convention.js'),
				parser: require.resolve('@typescript-eslint/parser'),
				options: [{ path: '.*', default: true }],
			},
			{
				code: `
					import React, { useState, useMemo } from 'react'
					function MyComponent() {
						const state = useState()
						useMemo()
						React.memo()
					}
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }, { name: '.*', forbidden: true }] }],
			},
			{
				code: `
					const React = require('react')
					const useState = require('react').useState
					const useMemo = require('react').useMemo
					const { useCallback } = require('react')
					function MyComponent() {
						const state = useState()
						useMemo()
						useCallback()
						React.memo()
					}
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }, { name: '.*', forbidden: true }] }],
			},
		],
		invalid: [
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: 'aaa', default: false }],
				errors: [{ message: 'Unexpected the default import.' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', default: true }],
				errors: [{ message: 'Expected the default import.' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: 'aaa', default: 'AAA' }],
				errors: [{ message: 'Expected the default import to be "AAA".' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: '(.*)', default: '$1' }],
				errors: [{ message: 'Expected the default import to be "aaa".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: false }],
				errors: [{ message: 'Unexpected the namespace import.' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', namespace: true }],
				errors: [{ message: 'Expected the namespace import.' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: 'AAA' }],
				errors: [{ message: 'Expected the namespace import to be "AAA".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: '(.*)', namespace: '$1' }],
				errors: [{ message: 'Expected the namespace import to be "aaa".' }],
			},
			{
				code: `import { AAA } from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
				errors: [{ message: 'Unexpected any named imports.' }],
			},
			{
				code: `import { aaa as XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: false }] }],
				errors: [{ message: 'Expected the named import to be "aaa".' }],
			},
			{
				code: `import { aaa as XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: 'AAA' }] }],
				errors: [{ message: 'Expected the named import to be "AAA".' }],
			},
			{
				code: `import { useState } from 'react'`,
				options: [{ path: '^react$', named: [{ name: '^use(\\w+)$', rename: 'make$1' }] }],
				errors: [{ message: 'Expected the named import to be "makeState".' }],
			},
			{
				code: `import { aaa } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', forbidden: true }] }],
				errors: [{ message: 'Unexpected the named import "aaa".' }],
			},
			{
				code: `import React, { memo } from 'react'`,
				options: [{ path: 'react', default: 'X', named: [{ name: '^(?!use)', forbidden: true }] }],
				errors: [
					{ message: 'Expected the default import to be "X".' },
					{ message: 'Unexpected the named import "memo".' },
				],
			},
			{
				code: `
					import react from 'react'
					import Moment from 'moment'
				`,
				filename: fp.join(__dirname, 'import-convention.js'),
				parser: require.resolve('@typescript-eslint/parser'),
				options: [{ path: '.*', default: true }],
				errors: [
					{ message: 'Expected the default import to be "React".' },
					{ message: 'Expected the default import to be "moment".' },
				],
			},
			{
				code: `
					import React from 'react'
					function MyComponent() {
						const state = React.useState()
						React.useMemo()
						React.memo()
					}
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }, { name: '.*', forbidden: true }] }],
				errors: [
					{ message: 'Expected "useState" to be imported directly.' },
					{ message: 'Expected "useMemo" to be imported directly.' },
				],
			},
			{
				code: `
					const React = require('react')
					const { memo } = require('react')
					function MyComponent() {
						const state = React.useState()
						React.useMemo()
						React.useCallback()
						memo()
					}
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }, { name: '.*', forbidden: true }] }],
				errors: [
					{ message: 'Unexpected the named import "memo".' },
					{ message: 'Expected "useState" to be imported directly.' },
					{ message: 'Expected "useMemo" to be imported directly.' },
					{ message: 'Expected "useCallback" to be imported directly.' },
				],
			},
		]
	}
}

const findType = _.memoize((moduleName, workingDirectoryPath) => {
	const ts = require('typescript')

	const typeDefinitionPath = (() => {
		const directoryParts = _.trim(workingDirectoryPath, fp.sep).split(/\\|\//g)
		for (let index = directoryParts.length; index > 1; index--) {
			const basePath = directoryParts.slice(0, index)

			const directModulePath = fp.join(...basePath, 'node_modules', moduleName)
			if (fs.existsSync(directModulePath) && fs.lstatSync(directModulePath).isDirectory()) {
				const packagePath = fp.join(directModulePath, 'package.json')
				if (fs.existsSync(packagePath)) {
					const packageJson = require(packagePath)
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
		return undefined
	}

	const root = ts.createSourceFile(typeDefinitionPath, fs.readFileSync(typeDefinitionPath, 'utf-8'), ts.ScriptTarget.Latest)

	// Match `declare module "x" {}`
	const scopedModules = root.statements.filter(node => _.isMatch(node, {
		kind: ts.SyntaxKind.ModuleDeclaration,
		name: { kind: ts.SyntaxKind.StringLiteral, text: moduleName }
	}))

	const statements = root.statements.concat(...scopedModules.map(node => node.statements))

	// Match `export = X;`
	const defaultExportNode = statements.find(node => _.isMatch(node, {
		kind: ts.SyntaxKind.ExportAssignment,
		expression: { kind: ts.SyntaxKind.Identifier },
	}))
	if (defaultExportNode) {
		return defaultExportNode.expression.escapedText
	}

	// Match `export as namespace X;`
	const namespaceExportNode = root.statements.find(node => _.isMatch(node, {
		kind: ts.SyntaxKind.NamespaceExportDeclaration,
		name: { kind: ts.SyntaxKind.Identifier },
	}))
	if (namespaceExportNode) {
		return namespaceExportNode.name.escapedText
	}
}, (...params) => params.join('|'))
