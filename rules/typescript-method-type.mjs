// @ts-check

import { defineRule } from '@oxlint/plugins'
import _ from 'lodash'

export default defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce writing function types using arrow notation',
    },
    fixable: 'code',
  },
  createOnce(context) {
    return {
      TSMethodSignature(root) {
        context.report({
          node: root,
          message: 'Expected to be using arrow notation',
          fix: fixer => fixer.replaceText(
            root,
            context.sourceCode.getText(root.key) +
            (root.optional ? '?' : '') +
            ': ' +
            (root.typeParameters ? context.sourceCode.getText(root.typeParameters) : '') +
            '(' +
            _.map(root.params, node => context.sourceCode.getText(node)).join(
              ', '
            ) +
            ') => ' +
            (root.returnType
              ? context.sourceCode.getText(root.returnType).replace(/^:\s*/, '')
              : 'void')
          ),
        })
      },
    }
  },
})
