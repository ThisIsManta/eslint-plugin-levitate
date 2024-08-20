// @ts-check

const _ = require('lodash')

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce writing function types using arrow notation',
    },
    fixable: 'code',
  },
  create: function (context) {
    return {
      /**
       * @param {import('@typescript-eslint/types').TSESTree.TSMethodSignature} root
       */
      TSMethodSignature: function (root) {
        context.report({
          node: cast(root),
          message: 'Expected to be using arrow notation',
          fix: fixer => fixer.replaceText(
            cast(root),
            context.sourceCode.getText(cast(root.key)) +
            (root.optional ? '?' : '') +
            ': ' +
            (root.typeParameters ? context.sourceCode.getText(cast(root.typeParameters)) : '') +
            '(' +
            _.map(root.params, node => context.sourceCode.getText(cast(node))).join(
              ', '
            ) +
            ') => ' +
            (root.returnType
              ? context.sourceCode.getText(cast(root.returnType)).replace(/^:\s*/, '')
              : 'void')
          ),
        })
      },
    }
  },
  tests: process.env.TEST && {
    valid: [
      {
        code: `
        interface X {
          onClick: <T>(a, b, c) => void
        }
        `,
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
          parserOptions: {
            ecmaFeatures: { jsx: true },
          },
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
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
          parserOptions: {
            ecmaFeatures: { jsx: true },
          },
        },
        errors: [
          { message: 'Expected to be using arrow notation' },
        ],
        output: `
        interface X {
          onClick: <T>(a, b, c) => void
        }
        `,
      },
      {
        code: `
        interface X {
          onClose?()
        }
        `,
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
          parserOptions: {
            ecmaFeatures: { jsx: true },
          },
        },
        errors: [
          { message: 'Expected to be using arrow notation' },
        ],
        output: `
        interface X {
          onClose?: () => void
        }
        `,
      },
      {
        code: `
        interface X {
          onClose?<T>()
        }
        `,
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
          parserOptions: {
            ecmaFeatures: { jsx: true },
          },
        },
        errors: [
          { message: 'Expected to be using arrow notation' },
        ],
        output: `
        interface X {
          onClose?: <T>() => void
        }
        `,
      },
    ],
  },
}

/**
 * @param {*} node
 * @return {import('eslint').Rule.Node}
 */
function cast(node) {
  return node
}
