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

const METHOD_ALL = {
	type: 'Identifier',
	name: 'all',
}

module.exports = {
	meta: {
		docs: {
			description: 'enforce passing a static array to `Promise.all()`',
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
				if (_.isMatch(workNode.callee.property, METHOD_ALL) === false) {
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

				if (workNode.arguments[0].type !== 'ArrayExpression' || workNode.arguments[0].elements.some(node => node.type === 'SpreadElement')) {
					return context.report({
						node: workNode.arguments[0],
						message: `Expected ${identifier}.all() to have a parameter of a static array.`,
					})
				}
			}
		}
	},
	tests: {
		valid: [
			'Promise.all()',
			'Promise.all([])',
			'Promise.all([1, 2, 3])',
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.all([1, 2, 3])
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: 'Promise.all([1, 2, 3, ...x])',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected Promise.all() to have a parameter of a static array.', }]
			},
			{
				code: 'Promise.all(x)',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected Promise.all() to have a parameter of a static array.', }]
			},
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.all([1, 2, 3, ...x])
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected Bluebird.all() to have a parameter of a static array.', }]
			},
			{
				code: `
					const Bluebird = require('bluebird')
					Bluebird.all(x)
				`,
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ message: 'Expected Bluebird.all() to have a parameter of a static array.', }]
			},
		]
	}
}
