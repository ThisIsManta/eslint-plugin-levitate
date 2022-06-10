const _ = require('lodash')

const ALLOWED_TEST_PATTERN = /^(returns|renders|calls|fetches|sets|throws|does not (return|render|call|fetch|set|throw) )/
const DISALLOWED_WORDS = ['proper', 'correct', 'appropriate', 'accurate', 'perfect']
const DISALLOWED_PATTERN = new RegExp('\\W((' + DISALLOWED_WORDS.join('|') + ')(ly)?)(\\W|$)', 'i')

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
				const functionCall = _.get(root, 'expression.callee.name')
				if (functionCall !== 'it' && functionCall !== 'test') {
					return
				}

				const titleNode = _.get(root, 'expression.arguments.0')
				const titleText = getText(titleNode)
				if (_.isString(titleText) === false) {
					return
				}


				if (ALLOWED_TEST_PATTERN.test(titleText) === false) {
					return context.report({
						node: titleNode,
						messageId: 'start',
					})
				}

				if (DISALLOWED_PATTERN.test(titleText)) {
					return context.report({
						node: titleNode,
						messageId: 'vague',
						data: {
							word: titleText.match(DISALLOWED_PATTERN)[1]
						}
					})
				}
			},
		}
	},
	tests: {
		valid: [
			{
				code: 'it("returns something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: 'it("renders something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: 'it("calls something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: 'it("fetches something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: 'it("sets something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: 'it("throws an error", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: 'it("does not return something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
			{
				code: 'it(`returns ${something}`, function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
			},
		],
		invalid: [
			{
				code: 'it("does not renders something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("displays something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("should do something", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'start' }],
			},
			{
				code: 'it("renders properly", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'vague' }],
			},
			{
				code: 'it("renders proper data", function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'vague' }],
			},
			{
				code: 'it(`${something}returns`, function() {})',
				parserOptions: { ecmaVersion: 6, sourceType: 'module' },
				errors: [{ messageId: 'start' }],
			},
		],
	},
}

function getText(node) {
	if (!node) {
		return undefined
	}

	if (node.type === 'Literal' && _.isString(node.value)) {
		return node.value
	}

	if (node.type === 'TemplateLiteral') {
		return _.get(node, 'quasis.0.value.cooked')
	}
}

module.exports.getText = getText
