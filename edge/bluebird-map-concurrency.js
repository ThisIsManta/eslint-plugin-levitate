const _ = require('lodash')

const REQUIRE_BLUEBIRD = {
	id: {
		type: 'Identifier',
	},
	init: {
		type: 'CallExpression',
		callee: {
			type: 'Identifier',
			name: 'require',
		},
		arguments: [
			{
				type: 'Literal',
				value: 'bluebird',
			}
		]
	}
}

const METHOD_MAP = {
	type: 'Identifier',
	name: 'map',
}

module.exports = {
	meta: {
		docs: {
			description: 'enforce passing a concurrency number to [`Bluebird.map`](http://bluebirdjs.com/docs/api/promise.map.html), for example `Bluebird.map([promise], { concurrency: 5 })`',
			category: 'Best Practices',
		},
	},
	create: function (context) {
		let bluebirdIdentifier
		return {
			VariableDeclarator: function (workNode) {
				if (_.isMatch(workNode, REQUIRE_BLUEBIRD)) {
					bluebirdIdentifier = workNode.id.name
				}
			},
			CallExpression: function (workNode) {
				if (_.isMatch(workNode.callee.property, METHOD_MAP) === false) {
					return null
				}

				const identifier = _.get(workNode, 'callee.object.name')
				if (identifier === undefined) {
					return null
				}

				if (identifier !== 'Promise' && identifier !== bluebirdIdentifier) {
					return null
				}

				if (workNode.arguments.length === 0) {
					return null
				}

				if (workNode.arguments.length < 3) {
					return context.report({
						node: workNode.callee.property,
						message: `Expected ${identifier}.map() to have a concurrency limit.`,
					})
				}

				if (workNode.arguments[2].type !== 'ObjectExpression' || workNode.arguments[2].properties.some(node => node.type === 'Property' && node.key && node.key.type === 'Identifier' && node.key.name === 'concurrency') === false) {
					return context.report({
						node: workNode.arguments[2],
						message: `Expected ${identifier}.map() to have a concurrency limit.`,
					})
				}
			}
		}
	},
	test: {
		valid: [
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.map()
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.map([1, 2, 3], x, { concurrency: 2 })
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.map([1, 2, 3])
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected Bluebird.map() to have a concurrency limit.', }]
			},
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.map([1, 2, 3], x)
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected Bluebird.map() to have a concurrency limit.', }]
			},
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.map([1, 2, 3], x, {})
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected Bluebird.map() to have a concurrency limit.', }]
			},
		]
	}
}
