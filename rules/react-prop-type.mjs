// @ts-check

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce writing type definition for React props',
    },
  },
  create(context) {
    /**
     * @param {import('estree').FunctionExpression} root
     */
    function check(root) {
      if (
        root.type === 'FunctionExpression' &&
        root.parent.type === 'MethodDefinition' &&
        root.parent.key.type === 'Identifier' &&
        root.parent.key.name === 'constructor'
      ) {
        return
      }

      if (
        root.params.length > 0 &&
        root.params[0].type === 'Identifier' &&
        root.params[0].name === 'props' &&
        (!('typeAnnotation' in root.params[0]) || !root.params[0].typeAnnotation)
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
  }
}
