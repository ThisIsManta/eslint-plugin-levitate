// @ts-check

const _ = require('lodash')

const ALLOWED_TEST_PATTERN = /^(returns|renders|calls|fetches|sets|throws|does not (return|render|call|fetch|set|throw) )/
const DISALLOWED_WORDS = ['proper', 'correct', 'appropriate', 'accurate', 'perfect']
const DISALLOWED_PATTERN = new RegExp('\\W((' + DISALLOWED_WORDS.join('|') + ')(ly)?)(\\W|$)', 'i')

/**
 * @type {import('eslint').Rule.RuleModule & { getText: typeof getText }}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing consistent test case titles for `it` and `test` function calls; the allowed pattern of the test case title is `"(does not) return/render/call/fetch/set/throw(s) ... (, given ...)"`; this also disallows writing some vague words, such ' + DISALLOWED_WORDS.join(', '),
		},
		messages: {
			start: 'Expected the test case title to start with "(does not) return/render/call/fetch/set/throw(s) ... (, given ...)" only',
			vague: 'Expected the test case title to provide more details rather using the word "{{word}}"',
			direct: 'Expected the description title to be the direct reference of the function (removing the string quotes)',
		},
	},
	create: function (context) {
		return {
			ExpressionStatement: function (root) {
				if (
					root.expression.type !== 'CallExpression' ||
					root.expression.callee.type !== 'Identifier' ||
					root.expression.arguments.length < 2
				) {
					return 
				}

				const functionCall = root.expression.callee.name
				if (functionCall !== 'it' && functionCall !== 'test') {
					return
				}

				const titleNode = root.expression.arguments[0]
				const titleText = getText(titleNode)
				if (typeof titleText !== 'string') {
					return
				}


				if (ALLOWED_TEST_PATTERN.test(titleText) === false) {
					return context.report({
						node: titleNode,
						messageId: 'start',
					})
				}

				const bannedWord = titleText.match(DISALLOWED_PATTERN)?.[1]
				if (bannedWord) {
					return context.report({
						node: titleNode,
						messageId: 'vague',
						data: {
							word: bannedWord
						}
					})
				}
			},
		}
	},
	tests: process.env.TEST && {
		valid: [
			{
				code: 'it("returns something", function() {})',
			},
			{
				code: 'it("renders something", function() {})',
			},
			{
				code: 'it("calls something", function() {})',
			},
			{
				code: 'it("fetches something", function() {})',
			},
			{
				code: 'it("sets something", function() {})',
			},
			{
				code: 'it("throws an error", function() {})',
			},
			{
				code: 'it("does not return something", function() {})',
			},
			{
				code: 'it(`returns ${something}`, function() {})',
			},
		],
		invalid: [
			{
				code: 'it("does not renders something", function() {})',
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("displays something", function() {})',
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("should do something", function() {})',
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("renders properly", function() {})',
				errors: [{ messageId: 'vague' }],
			},
			{
				code: 'it("renders proper data", function() {})',
				errors: [{ messageId: 'vague' }],
			},
			{
				code: 'it(`${something}returns`, function() {})',
				errors: [{ messageId: 'start' }],
			},
		],
	},
}

/**
 * @param {import('estree').Node} node
 * @return {string | undefined}
 */
function getText(node) {
	if (!node) {
		return undefined
	}

	if (node.type === 'Literal' && typeof node.value === 'string') {
		return node.value
	}

	if (node.type === 'TemplateLiteral') {
		return _.get(node, 'quasis.0.value.cooked', undefined)
	}
}

module.exports.getText = getText
