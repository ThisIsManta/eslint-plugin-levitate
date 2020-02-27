const _ = require('lodash')

module.exports = {
	meta: {
		docs: {
			description: 'enforce having a new line between `it`, `test`, and `describe` function calls; this applies to _*.{test,spec}_ files only',
			category: 'Stylistic Issues',
		},
		messages: {
			blankLine: 'Expected to have a new line before this',
		},
		fixable: 'code',
	},
	create: function(context) {
		// Skip non-test files
		if (/\.(test|spec)\.(j|t)sx?$/.test(context.getFilename()) === false) {
			return {}
		}

		return {
			ExpressionStatement: function(root) {
				if (
					/^(it|test|describe)$/.test(_.get(root, 'expression.callee.name')) ===
					false
				) {
					return null
				}

				const parentNode = _.last(context.getAncestors())
				if (_.isArray(parentNode.body) === false) {
					return null
				}

				const index = _.findIndex(parentNode.body, root)
				if (
					index > 0 &&
					parentNode.body[index - 1].loc.end.line >= root.loc.start.line - 1
				) {
					context.report({
						node: root.expression.callee,
						messageId: 'blankLine',
						fix: fixer =>
							fixer.replaceText(
								root,
								'\n' + context.getSourceCode().getText(root)
							),
					})
				}
			},
		}
	},
	test: {
		valid: [
			{
				code: [
					'it("xxx", function() {})',
					'',
					'it("xxx", function() {})',
					'',
					'it("xxx", function() {})',
				].join('\n'),
				filename: 'file.test.ts',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: [
					'describe("xxx", function() {',
					'it("xxx", function() {})',
					'',
					'it("xxx", function() {})',
					'',
					'it("xxx", function() {})',
					'})',
				].join('\n'),
				filename: 'file.test.ts',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: ['it("xxx", function() {})', 'it("xxx", function() {})'].join(
					'\n'
				),
				filename: 'file.test.ts',
				errors: [
					{
						messageId: 'blankLine',
					},
				],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				output: [
					'it("xxx", function() {})',
					'',
					'it("xxx", function() {})',
				].join('\n'),
			},
			{
				code: [
					'describe("xxx", function() {',
					'it("xxx", function() {})',
					'it("xxx", function() {})',
					'})',
				].join('\n'),
				filename: 'file.test.ts',
				errors: [
					{
						messageId: 'blankLine',
					},
				],
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				output: [
					'describe("xxx", function() {',
					'it("xxx", function() {})',
					'',
					'it("xxx", function() {})',
					'})',
				].join('\n'),
			},
		],
	},
}
