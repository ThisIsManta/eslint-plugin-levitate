const _ = require('lodash')

module.exports = {
  meta: {
    /**
     * Use https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/naming-convention.md instead
     */
    deprecated: true,
    docs: {
      description: 'enforce writing a type name with Pascal case',
      category: 'Stylistic Issues',
    },
  },
  create: function (context) {
    return {
      TSTypeAliasDeclaration: function (node) {
        if (node.id.name[0] !== node.id.name[0].toUpperCase()) {
          context.report({
            node: node.id,
            message: `Expected type name "${
              node.id.name
              }" to be "${_.upperFirst(node.id.name)}".`,
          })
        }
      },
    }
  },
  tests: {
    valid: [
      {
        code: 'type FirstCapitalLetterType = {}',
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
      {
        code: 'const camelCase = {}',
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
      },
    ],
    invalid: [
      {
        code: 'type firstSmallLetterType = {}',
        parser: require.resolve('@typescript-eslint/parser'),
        parserOptions: { ecmaVersion: 6, sourceType: 'module' },
        errors: [
          {
            message:
              'Expected type name "firstSmallLetterType" to be "FirstSmallLetterType".',
          },
        ],
      },
    ],
  },
}
