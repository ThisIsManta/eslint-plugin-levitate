'use strict'

const _ = require('lodash')

module.exports = {
  meta: {
    docs: {
      description: 'enforce writing consistent test case titles for `it` and `test` function calls; this applies to _*.{test,spec}_ files only; the pattern of the test case title is `"(does not) return/render/call/fetch/set/throw(s) ... (, given ...)"`',
      category: 'Stylistic Issues',
    },
    messages: {
      naming:
        'Expected test case titles to start with "(does not) return/render/call/fetch/set/throw(s) ... (, given ...)" only',
    },
  },
  create: function(context) {
    // Skip non-test files
    if (/\.(test|spec)\.(j|t)sx?$/.test(context.getFilename()) === false) {
      return {}
    }

    return {
      ExpressionStatement: function(root) {
        if (
          /^(it|test)$/.test(_.get(root, 'expression.callee.name')) === false
        ) {
          return null
        }

        const node = _.get(root, 'expression.arguments.0')
        if (
          node &&
          _.isString(node.value) &&
          /^(returns|renders|calls|fetches|sets|throws|does not (return|render|call|fetch|set|throw) )/.test(
            node.value
          ) === false
        ) {
          context.report({
            node,
            messageId: 'naming',
          })
        }
      },
    }
  },
  tests: {
    valid: [
      {
        code: 'it("returns something", function() {})',
        filename: 'file.test.ts',
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'it("renders something", function() {})',
        filename: 'file.test.ts',
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'it("calls something", function() {})',
        filename: 'file.test.ts',
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'it("fetches something", function() {})',
        filename: 'file.test.ts',
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'it("sets something", function() {})',
        filename: 'file.test.ts',
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'it("throws an error", function() {})',
        filename: 'file.test.ts',
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'it("does not return something", function() {})',
        filename: 'file.js',
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
    ],
    invalid: [
      {
        code: 'it("does not renders something", function() {})',
        filename: 'file.test.ts',
        errors: [
          {
            messageId: 'naming',
          },
        ],
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'it("displays something", function() {})',
        filename: 'file.test.ts',
        errors: [
          {
            messageId: 'naming',
          },
        ],
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'it("should do something", function() {})',
        filename: 'file.test.ts',
        errors: [
          {
            messageId: 'naming',
          },
        ],
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
    ],
  },
}
