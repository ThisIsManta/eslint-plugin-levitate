const _ = require('lodash')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce writing type definition for React props',
    },
  },
  create: function (context) {
    function check(root) {
      const parentNodes = context.getAncestors()

      if (
        root.type === 'FunctionExpression' &&
        _.isMatch(_.last(parentNodes), {
          type: 'MethodDefinition',
          key: { type: 'Identifier', name: 'constructor' },
        })
      ) {
        return
      }

      if (
        parentNodes.some(node =>
          _.isMatch(node, {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: 'compose' },
          })
        )
      ) {
        return
      }

      if (
        parentNodes.some(node =>
          _.isMatch(node, {
            type: 'VariableDeclarator',
            id: { type: 'Identifier', name: 'enhance' },
          })
        )
      ) {
        return
      }

      if (
        root.params.length > 0 &&
        root.params[0].type === 'Identifier' &&
        root.params[0].name === 'props' &&
        !root.params[0].typeAnnotation
      ) {
        return context.report({
          node: root.params[0],
          message: 'Expected to have type definition',
        })
      }
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    }
  },
  tests: {
    valid: [
      {
        code: `
        function A(props: Props) {}
        const B = function (props: Props) {}
        const C = (props: Props) => {}
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
        },
      },
      {
        code: `
        function A(param) {}
        const B = function (param) {}
        const C = (param) => {}
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
        },
      },
      {
        code: `
        class X {
          constructor(props) {}
        }
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
        },
      },
      {
        code: `
        compose(withSelectors(props => ({})))
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
        },
      },
      {
        code: `
        const enhance = props => {}
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
        },
      },
    ],
    invalid: [
      {
        code: `
        function A(props) {}
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
        },
        errors: [
          {
            message: 'Expected to have type definition',
          },
        ],
      },
    ],
  },
}
