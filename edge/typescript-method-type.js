const _ = require('lodash')

module.exports = {
  meta: {
    docs: {
      description: 'enforce writing function types using arrow notation',
      category: 'Stylistic Issues',
    },
    fixable: 'code',
  },
  create: function(context) {
    return {
      TSMethodSignature: function(root) {
        const sourceCode = context.getSourceCode()
        context.report({
          node: root,
          message: 'Expected to be using arrow notation',
          fix: fixer => fixer.replaceText(
            root,
            sourceCode.getText(root.key) +
            (root.optional ? '?' : '') +
            ': ' +
            (root.typeParameters ? sourceCode.getText(root.typeParameters) : '') +
            '(' +
            _.map(root.params, node => sourceCode.getText(node)).join(
              ', '
            ) +
            ') => ' +
            (root.returnType
              ? sourceCode.getText(root.returnType).replace(/^:\s*/, '')
              : 'void')
          ),
        })
      },
    }
  },
  tests: {
    valid: [
      {
        code: `
        interface X {
          onClick: <T>(a, b, c) => void
        }
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      },
    ],
    invalid: [
      {
        code: `
        interface X {
          onClick<T>(a, b, c): void
        }
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
        errors: [
          {
            message: 'Expected to be using arrow notation',
            output: `
            interface X {
              onClick: <T>(a, b, c) => void
            }
            `,
          },
        ],
      },
      {
        code: `
        interface X {
          onClose?<T>()
        }
        `,
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: {
          ecmaVersion: 6,
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
        errors: [
          {
            message: 'Expected to be using arrow notation',
            output: `
            interface X {
              onClose?: () => void
            }
            `,
          },
        ],
      },
    ],
  },
}
