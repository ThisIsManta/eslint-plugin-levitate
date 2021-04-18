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
					path: {
						anyOf: [
							{ type: 'string' },
							{ type: 'object' }, // RegExp
						]
					},
					default: { /* undefined | boolean | string | (path, rule) => string */ },
					namespace: { /* undefined | boolean | string | (path, rule) => string */ },
					named: { /* undefined | false | Array<{ name: string | RegExp, rename?: string | (path, rule) => string, forbidden: boolean }> */ }
				},
				required: ['path']
			}
		},
	},
	create: function (context) {
		// TODO: support `require`
		return {
			ImportDeclaration: function (root) {
				const workPath = root.source.value
				const rule = context.options.find(({ path }) => path === workPath || path instanceof RegExp && path.test(workPath))
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

					const expectedName = (() => {
						if (typeof rule.namespace === 'string') {
							if (rule.path instanceof RegExp) {
								return workPath.replace(rule.path, rule.namespace)
							}

							return rule.namespace
						}

						if (typeof rule.namespace === 'function') {
							return rule.namespace(workPath, rule)
						}

						return null
					})()
					if (expectedName && expectedName !== namespaceNode.local.name) {
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
						message: `Expected the namespace import to exist.`,
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

					const expectedName = (() => {
						if (typeof rule.default === 'string') {
							if (rule.path instanceof RegExp) {
								return workPath.replace(rule.path, rule.default)
							}

							return rule.default
						}

						if (typeof rule.default === 'function') {
							return rule.default(workPath, rule)
						}

						return defaultNode.local.name
					})()
					if (expectedName !== defaultNode.local.name) {
						context.report({
							node: defaultNode,
							message: `Expected the default import to be "${expectedName}".`,
						})
					}

				} else if (rule.default) {
					context.report({
						node: root,
						message: `Expected the default import to exist.`,
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
						const subrule = rule.named.find(({ name }) => (
							name === namedNode.imported.name ||
							name instanceof RegExp && name.test(namedNode.imported.name)
						))

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

						const expectedName = (() => {
							if (typeof subrule.rename === 'string') {
								return subrule.rename
							}

							if (typeof subrule.rename === 'function') {
								return subrule.rename(namedNode.imported.name, subrule)
							}

							return namedNode.imported.name
						})()
						if (expectedName && expectedName !== namedNode.local.name) {
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
				options: [{ path: 'aaa', default: false }, { path: 'aaa', default: false }],
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
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', default: (path) => path.toUpperCase() }],
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: /^aaa$/, default: 'AAA' }],
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
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', namespace: (path) => path.toUpperCase() }],
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: /^aaa$/, namespace: 'AAA' }],
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
				code: `import { aaa as AAA } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: /^aaa$/, rename: (path) => path.toUpperCase() }] }],
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
				errors: [{ message: 'Expected the default import to exist.' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: 'aaa', default: 'AAA' }],
				errors: [{ message: 'Expected the default import to be "AAA".' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: 'aaa', default: (path) => path.toUpperCase() }],
				errors: [{ message: 'Expected the default import to be "AAA".' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: /^aaa$/, default: 'AAA' }],
				errors: [{ message: 'Expected the default import to be "AAA".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: false }],
				errors: [{ message: 'Unexpected the namespace import.' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', namespace: true }],
				errors: [{ message: 'Expected the namespace import to exist.' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: 'AAA' }],
				errors: [{ message: 'Expected the namespace import to be "AAA".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: (path) => path.toUpperCase() }],
				errors: [{ message: 'Expected the namespace import to be "AAA".' }],
			},
			{
				code: `import * as XX from 'aaa'`,
				options: [{ path: /^aaa$/, namespace: 'AAA' }],
				errors: [{ message: 'Expected the namespace import to be "AAA".' }],
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
				code: `import { aaa } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: /^aaa$/, rename: (path) => path.toUpperCase() }] }],
				errors: [{ message: 'Expected the named import to be "AAA".' }],
			},
			{
				code: `import { aaa } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', forbidden: true }] }],
				errors: [{ message: 'Unexpected the named import "aaa".' }],
			},
		]
	}
}
