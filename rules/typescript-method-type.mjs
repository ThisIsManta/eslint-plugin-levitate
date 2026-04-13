// @ts-check

import _ from 'lodash'

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce writing function types using arrow notation',
    },
    fixable: 'code',
  },
  create(context) {
    return {
      /**
       * @param {import('@typescript-eslint/types').TSESTree.TSMethodSignature} root
       */
      TSMethodSignature(root) {
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
}

/**
 * @param {*} node
 * @return {import('eslint').Rule.Node}
 */
function cast(node) {
  return node
}
