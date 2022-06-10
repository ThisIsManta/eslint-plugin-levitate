const _ = require('lodash')

module.exports = {
	meta: {
		deprecated: true,
		replacedBy: ['levitate/new-line-between-blocks'],
		type: 'layout',
		docs: {
			description: 'enforce having a new line per chaining method',
		},
		fixable: 'whitespace',
		messages: {
			error: 'Expected a new line before each chaining method.',
		}
	},
	create: function (context) {
		return {
			'CallExpression:exit': function (root) {
				if (root.parent.type !== 'MemberExpression') {
					return
				}
				
				if (root.loc.end.line === root.parent.property.loc.start.line) {
					const sourceCode = context.getSourceCode()
					const dot = sourceCode.getTokenBefore(root.parent.property)
					context.report({
						loc: dot.loc,
						messageId: 'error',
						fix: (fixer) => fixer.insertTextBefore(dot, '\n')
					})	
				}
			}
		}
	},
	tests: {
		valid: [
			{
				code: `
					_.chain()
					  .map()
						.prop.reduce()
						.value()
				`,
			},
		],
		invalid: [
			{
				code: `
					_.chain().map().prop.reduce().value()
				`,
				output: `
					_.chain()
.map()
.prop.reduce()
.value()
				`,
				errors: [
					{ messageId: 'error', line: 2 },
					{ messageId: 'error', line: 2 },
					{ messageId: 'error', line: 2 },
				],
			},
			{
				code: `
					_.chain()
						.map().prop.reduce().value()
				`,
				output: `
					_.chain()
						.map()
.prop.reduce()
.value()
				`,
				errors: [
					{ messageId: 'error', line: 3 },
					{ messageId: 'error', line: 3 },
				],
			},
		]
	}
}
