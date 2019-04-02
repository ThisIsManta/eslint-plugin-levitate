'use strict'

const errorMessage = 'Expected the test not to call "only" function.'

module.exports = {
  meta: {
    docs: {
      description: 'Prevent test with .only',
      category: 'ECMAScript 6',
    },
  },
  create: function (context) {
    return {
      CallExpression: function (root) {
        if (root.callee.property && root.callee.property.name === 'only') {
          // Test if it is Lab test
          if (root.callee.object.type === 'MemberExpression') {
            if (root.callee.object.object.name === 'lab') {
              return context.report({
                node: root.callee,
                message: errorMessage
              })
            }
          }

          // Test if it is Jest test
          const jestPrefixes = [
            'describe',
            'it'
          ]
          if (root.callee.object.type === 'Identifier' && jestPrefixes.includes(root.callee.object.name)) {
            return context.report({
              node: root.callee,
              message: errorMessage
            })
          }
        }

        return null
      }
    }
  },
  test: {
    valid: [
      {
        code: "lab.test('hello', () => null)",
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: "lab.experiment('hello', () => null)",
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: "it('hello', () => { })",
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      }
    ],
    invalid: [
      {
        code: "lab.test.only('Sanity test', () => { })",
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
        errors: [{ message: errorMessage, }]
      },
      {
        code: "lab.experiment.only('Sanity test', () => { })",
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
        errors: [{ message: errorMessage, }]
      },
      {
        code: "it.only('Sanity test', () => { })",
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
        errors: [{ message: errorMessage, }]
      },
      {
        code: "describe.only('Sanity test', () => { })",
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
        errors: [{ message: errorMessage, }]
      },
    ]
  }
}
