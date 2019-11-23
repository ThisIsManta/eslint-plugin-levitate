'use strict'

const _ = require('lodash')

const ALLOWED_PATTERN = /^(returns|renders|calls|fetches|sets|throws|does not (return|render|call|fetch|set|throw) )/
const DISALLOWED_WORDS = ['proper', 'correct', 'appropriate', 'accurate', 'perfect']
const DISALLOWED_PATTERN = new RegExp('\\W((' + DISALLOWED_WORDS.join('|') + ')(ly)?)(\\W|$)', 'i')

module.exports = {
  meta: {
    docs: {
      description: 'enforce writing consistent test case titles for `it` and `test` function calls; the allowed pattern of the test case title is `"(does not) return/render/call/fetch/set/throw(s) ... (, given ...)"`; this also disallows writing some vague words, such ' + DISALLOWED_WORDS.join(', '),
      category: 'Stylistic Issues',
    },
    messages: {
      start: 'Expected the test case title to start with "(does not) return/render/call/fetch/set/throw(s) ... (, given ...)" only',
      vague: 'Expected the test case title to provide more details rather using the word {{word}}',
    },
  },
  create: function(context) {
    return {
      ExpressionStatement: function(root) {
        const functionCall = _.get(root, 'expression.callee.name')
        if (functionCall !== 'it' && functionCall !== 'test') {
          return
        }

        const titleNode = _.get(root, 'expression.arguments.0')
        if (!titleNode || _.isString(titleNode.value) === false) {
          return
        }

        if (ALLOWED_PATTERN.test(titleNode.value) === false) {
          return context.report({
            node: titleNode,
            messageId: 'start',
          })
        }

        if (DISALLOWED_PATTERN.test(titleNode.value)) {
          return context.report({
            node: titleNode,
            messageId: 'vague',
            data: {
              word: titleNode.value.match(DISALLOWED_PATTERN)[1]
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
    ],
  },
}
