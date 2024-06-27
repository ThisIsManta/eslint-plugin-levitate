/// <reference path="../types.d.ts" />
// @ts-check

/**
 * @type {Rule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce writing type definition for React props',
    },
  },
  create: function (context) {
    /**
     * @param {ES.FunctionExpression} root
     */
    function check(root) {
      const parentNodes = context.sourceCode.getAncestors(root)
      const lastParentNode = parentNodes.at(-1)

      if (
        root.type === 'FunctionExpression' &&
        lastParentNode &&
        lastParentNode.type === 'MethodDefinition' &&
        lastParentNode.key.type === 'Identifier' &&
        lastParentNode.key.name === 'constructor'
      ) {
        return
      }

      if (
        parentNodes.some(node =>
          node.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'compose'
        )
      ) {
        return
      }

      if (
        parentNodes.some(node =>
          node.type === 'VariableDeclarator' &&
          node.id.type === 'Identifier' &&
          node.id.name === 'enhance'
        )
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
  },
  tests: {
    valid: [
      {
        code: `
        function A(props: Props) {}
        const B = function (props: Props) {}
        const C = (props: Props) => {}
        `,
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
        },
      },
      {
        code: `
        function A(param) {}
        const B = function (param) {}
        const C = (param) => {}
        `,
      },
      {
        code: `
        class X {
          constructor(props) {}
        }
        `,
      },
      {
        code: `
        compose(withSelectors(props => ({})))
        `,
      },
      {
        code: `
        const enhance = props => {}
        `,
      },
    ],
    invalid: [
      {
        code: `
        function A(props) {}
        `,
        errors: [
          {
            message: 'Expected to have type definition',
          },
        ],
      },
    ],
  },
}
