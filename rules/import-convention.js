/// <reference path="../types.d.ts" />
// @ts-check

const _ = require('lodash')
const fs = require('fs')
const fp = require('path')

/**
 * @type {Rule}
 */
module.exports = {
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
	create: function (context) {
		const rules = context.options.map(({ path, named, ...rest }) => ({
			...rest,
			path: new RegExp(path),
			named: Array.isArray(named)
				? named.map(({ name, ...rest }) => ({ ...rest, name: new RegExp(name) }))
				: named
		}))

		/**
		 * @param {Object} options
		 * @param {ES.Node} options.root
		 * @param {string} options.modulePath
		 * @param {ES.Identifier} [options.namespaceNode]
		 * @param {ES.Identifier} [options.defaultNode]
		 * @param {Array<{ originalNode: ES.Identifier, givenNode?: ES.Identifier }>} [options.namedWrappers]
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
					const parentNode = /** @type {ES.Node} */ (defaultNode.parent)
					const accessors = _.compact(
						context.sourceCode.getDeclaredVariables(parentNode)[0].references
							.map((node) => {
								const identifier = /** @type {WithParent<ES.Node>} */ (node.identifier)
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
			ImportDeclaration: function (root) {
				const modulePath = String(root.source.value)
				const namespaceNode = root.specifiers.find((node) => node.type === 'ImportNamespaceSpecifier')
				const defaultNode = root.specifiers.find(/** @return {node is ES.ImportDefaultSpecifier} */(node) => node.type === 'ImportDefaultSpecifier')
				const namedNodes = root.specifiers.filter(/** @return {node is ES.ImportSpecifier} */(node) => node.type === 'ImportSpecifier')

				check({
					root,
					modulePath,
					namespaceNode: namespaceNode ? namespaceNode.local : undefined,
					defaultNode: defaultNode ? defaultNode.local : undefined,
					namedWrappers: namedNodes.map(node => ({ originalNode: node.imported, givenNode: node.local })),
				})
			},
			CallExpression: function (root) {
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
	},
	tests: {
		valid: [
			{
				code: `import XXX from 'xxx'`,
				options: [{ path: 'aaa', default: false }, { path: 'bbb', default: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', default: true }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', default: 'AAA' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import aaa from 'aaa'`,
				options: [{ path: '(.*)', default: '$1' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: ``,
				options: [{ path: 'aaa', namespace: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', namespace: true }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', namespace: 'AAA' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import * as aaa from 'aaa'`,
				options: [{ path: '(.*)', namespace: '$1' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', named: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import { XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'XXX' }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import { aaa } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: false }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import { aaa as AAA } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: 'AAA' }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import { useState as makeState } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: '^use(\\w+)', rename: 'make$1' }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `import React, { useEffect } from 'react'`,
				options: [{ path: 'react', default: 'React', named: [{ name: /^use\W+/ }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					import React from 'react'
					import moment from 'moment'
				`,
				filename: fp.join(__dirname, 'import-convention.js'),
				options: [{ path: '.*', default: true }],
				languageOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					parser: require('@typescript-eslint/parser'),
				},
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
				options: [{ path: 'react', default: 'React', named: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
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
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
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
					const _ = require('lodash')
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }] }, { path: '^lodash$', default: true, namespace: true }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: 'aaa', default: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Unexpected the default import.' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', default: true }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the default import.' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: 'aaa', default: 'AAA' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the default import to be "AAA".' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: '(.*)', default: '$1' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the default import to be "aaa".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Unexpected the namespace import.' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', namespace: true }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the namespace import.' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: 'AAA' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the namespace import to be "AAA".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: '(.*)', namespace: '$1' }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the namespace import to be "aaa".' }],
			},
			{
				code: `import { AAA } from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Unexpected any named imports.' }],
			},
			{
				code: `import { aaa as XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: false }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the named import to be "aaa".' }],
			},
			{
				code: `import { aaa as XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: 'AAA' }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the named import to be "AAA".' }],
			},
			{
				code: `import { useState } from 'react'`,
				options: [{ path: '^react$', named: [{ name: '^use(\\w+)$', rename: 'make$1' }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected the named import to be "makeState".' }],
			},
			{
				code: `import { aaa } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', forbidden: true }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Unexpected the named import "aaa".' }],
			},
			{
				code: `import React, { memo } from 'react'`,
				options: [{ path: 'react', default: 'X', named: [{ name: '^(?!use)', forbidden: true }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Expected the default import to be "X".' },
					{ message: 'Unexpected the named import "memo".' },
				],
			},
			{
				code: `
					import react from 'react'
				`,
				filename: fp.join(__dirname, 'import-convention.js'),
				options: [{ path: '.*', default: 'React' }],
				languageOptions: {
					ecmaVersion: 6,
					sourceType: 'module',
					parser: require('@typescript-eslint/parser'),
				},
				errors: [
					{ message: 'Expected the default import to be "React".' },
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
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }] }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
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
					const { get } = require('lodash')
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }, { name: '.*', forbidden: true }] }, { path: '^lodash$', default: true, namespace: true }],
				languageOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [
					{ message: 'Unexpected the named import "memo".' },
					{ message: 'Expected "useState" to be imported directly.' },
					{ message: 'Expected "useMemo" to be imported directly.' },
					{ message: 'Expected "useCallback" to be imported directly.' },
					{ message: 'Expected the default import.' },
				],
			},
		]
	}
}

const findType = _.memoize(
	/**
	 * @param {string} moduleName
	 * @param {string} workingDirectoryPath
	 * @return {string | null}
	 */
	(moduleName, workingDirectoryPath) => {
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
