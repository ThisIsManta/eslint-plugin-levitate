/// <reference path="../types.d.ts" />
// @ts-check

/**
 * @type {Rule}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing no top-level `require`',
		},
	},
	create: function (context) {
		return {
			CallExpression: function (root) {
				if (root.callee.type !== 'Identifier' || root.callee.name !== 'require' || root.arguments.length < 1 || root.arguments[0].type !== 'Literal') {
					return
				}

				for (const node of context.sourceCode.getAncestors(root).reverse()) {
					if (
						node.type === 'BlockStatement' ||
						node.type === 'ArrowFunctionExpression' ||
						node.type === 'ClassBody' ||
						node.type === 'TemplateLiteral'
					) {
						return
					}
				}

				context.report({
					node: root,
					message: 'Expected `require` to be `import` syntax',
				})
			},
		}
	},
	tests: {
		valid: [
			{
				code: 'require',
			},
			{
				code: 'require()',
			},
			{
				code: 'require(a)',
			},
			{
				code: 'const f = () => require("m")',
			},
			{
				code: 'const f = () => { require("m") }',
			},
			{
				code: 'class S { m = require("m") }',
				languageOptions: {
					parser: require('@typescript-eslint/parser'),
				},
			},
			{
				code: 'const s = `${require("m")}`',
			},
		],
		invalid: [
			{
				code: 'require("m")',
				errors: [{ message: 'Expected `require` to be `import` syntax' }],
			},
			{
				code: 'const m = require("m")',
				errors: [{ message: 'Expected `require` to be `import` syntax' }],
			},
			{
				code: 'require("m").call()',
				errors: [{ message: 'Expected `require` to be `import` syntax' }],
			},
		],
	},
}
