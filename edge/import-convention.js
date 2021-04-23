const _ = require('lodash')

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

		// TODO: support `require`
		return {
			ImportDeclaration: function (root) {
				const workPath = root.source.value
				const rule = rules.find(({ path }) => path.test(workPath))
				if (!rule) {
					return
				}

				const namespaceNode = root.specifiers.find(node => node.type === 'ImportNamespaceSpecifier')

				if (namespaceNode) {
					if (rule.namespace === false) {
						context.report({
							node: namespaceNode,
							message: `Unexpected the namespace import.`,
						})
					}

					const actualName = namespaceNode.local.name
					const expectedName = typeof rule.namespace === 'string'
						? workPath.replace(rule.path, rule.namespace)
						: actualName
					if (actualName !== expectedName) {
						context.report({
							node: namespaceNode,
							message: `Expected the namespace import to be "${expectedName}".`,
						})
					}

					// Stop processing since importing namespace cannot co-exist with other imports
					return

				} else if (rule.namespace) {
					context.report({
						node: root,
						message: `Expected the namespace import.`,
					})
				}

				const defaultNode = root.specifiers.find(node => node.type === 'ImportDefaultSpecifier')

				if (defaultNode) {
					if (rule.default === false) {
						context.report({
							node: defaultNode,
							message: `Unexpected the default import.`,
						})
					}

					const actualName = defaultNode.local.name
					const expectedName = typeof rule.default === 'string'
						? workPath.replace(rule.path, rule.default)
						: actualName
					if (actualName !== expectedName) {
						context.report({
							node: defaultNode,
							message: `Expected the default import to be "${expectedName}".`,
						})
					}

				} else if (rule.default) {
					context.report({
						node: root,
						message: `Expected the default import.`,
					})
				}

				const namedNodes = root.specifiers.filter(node => node.type === 'ImportSpecifier')

				if (namedNodes.length > 0 && rule.named === false) {
					context.report({
						node: root,
						message: `Unexpected any named imports.`,
					})
				}

				if (_.isArray(rule.named)) {
					for (const namedNode of namedNodes) {
						const subrule = rule.named.find(({ name }) => name.test(namedNode.imported.name))

						if (!subrule) {
							continue
						}

						if (subrule.forbidden) {
							context.report({
								node: namedNode.local,
								message: `Unexpected the named import "${namedNode.local.name}".`,
							})
							continue
						}

						if (subrule.rename === false && namedNode.imported.name !== namedNode.local.name) {
							context.report({
								node: namedNode.local,
								message: `Expected the named import to be "${namedNode.imported.name}".`,
							})
							continue
						}

						const actualName = namedNode.local.name
						const expectedName = typeof subrule.rename === 'string'
							? namedNode.imported.name.replace(subrule.name, subrule.rename)
							: actualName
						if (actualName !== expectedName) {
							context.report({
								node: namedNode.local || namedNode,
								message: `Expected the named import to be "${expectedName}".`,
							})
						}
					}
				}
			}
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
		]
	}
}
