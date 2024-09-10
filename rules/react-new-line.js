// @ts-check

const _ = require('lodash')

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    docs: {
      description:
        'enforce having an additional empty line between React elements if one of them spreads multiple lines',
    },
    fixable: 'whitespace',
    messages: {
      add: 'Expected a new line here.',
      remove: 'Unexpected a new line here.',
    },
  },
  create: function (context) {
    return {
      /**
       *
       * @param {import('@typescript-eslint/types').TSESTree.JSXElement} root
       */
      JSXElement: function (root) {
        const nonSpacingNodes = root.children.filter(
          (node) => node.type !== 'JSXText' || node.raw.trim().length > 0
        )

        if (nonSpacingNodes.length < 2) {
          return
        }

        const spacingNodes = _.compact(
          root.children.map((node, index, array) => {
            // Do not add new lines before the first or after the last element
            if (index === 0 || index === array.length - 1) {
              return null
            }

            if (node.type === 'JSXText' && node.value.trim().length === 0) {
              const prevNode = array[index - 1]
              const nextNode = array[index + 1]
              return { prevNode, node, nextNode }
            }

            return null
          })
        )

        for (const { prevNode, node, nextNode } of spacingNodes) {
          // Skip an actual whitespace
          if (node.value === ' ') {
            continue
          }

          // Avoid conflicting with Prettier
          if (
            prevNode.type === 'JSXExpressionContainer' &&
            prevNode.expression.type === 'Literal' &&
            typeof prevNode.expression.value === 'string' &&
            /^\s+$/.test(prevNode.expression.value)
          ) {
            continue
          }

          const newLineCount = node.value.match(/\n/g)?.length ?? 0
          if (
            prevNode.loc.start.line === prevNode.loc.end.line &&
            nextNode.loc.start.line === nextNode.loc.end.line
          ) {
            if (newLineCount > 1) {
              context.report({
                loc: {
                  start: { line: node.loc.start.line + 1, column: 0 },
                  end: { line: node.loc.start.line + 1, column: 0 },
                },
                messageId: 'remove',
                fix: (fixer) =>
                  fixer.replaceText(
                    node,
                    context.sourceCode
                      .getText(/** @type {any} */(node))
                      .replace(/^[ \t]*\n/, '')
                  ),
              })
            }
          } else {
            if (newLineCount === 1) {
              context.report({
                loc: {
                  start: node.loc.start,
                  end: node.loc.start,
                },
                messageId: 'add',
                fix: (fixer) => fixer.insertTextBefore(node, '\n'),
              })
            }
          }
        }
      },
    }
  },
  tests: process.env.TEST && {
    valid: [
      {
        code: `
        function Component() {
          return <div />
        }
        `,
        languageOptions: {
          parserOptions: {
            ecmaFeatures: { jsx: true },
          }
        },
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <p>
                text
              </p>
            </div>
          )
        }
        `,
        languageOptions: {
          parserOptions: {
            ecmaFeatures: { jsx: true },
          }
        },
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <span></span>
              <span></span>
            </div>
          )
        }
        `,
        languageOptions: {
          parserOptions: {
            ecmaFeatures: { jsx: true },
          }
        },
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <i /> <i />

              <p>
                text
              </p>
            </div>
          )
        }
        `,
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
          parserOptions: {
            ecmaFeatures: { jsx: true },
          }
        },
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <i />{' '}
              <p>
                text
              </p>
            </div>
          )
        }
        `,
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
          parserOptions: {
            ecmaFeatures: { jsx: true },
          }
        },
      },
    ],
    invalid: [
      {
        code: `
        function Component() {
          return (
            <div>
              <i /> <i />
              <p>
                text
              </p>
            </div>
          )
        }
        `,
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
          parserOptions: {
            ecmaFeatures: { jsx: true },
          }
        },
        errors: [{ messageId: 'add', line: 5, column: 26 }],
        output: `
        function Component() {
          return (
            <div>
              <i /> <i />

              <p>
                text
              </p>
            </div>
          )
        }
        `,
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <span></span>

              <span></span>
            </div>
          )
        }
        `,
        languageOptions: {
          parser: require('@typescript-eslint/parser'),
          parserOptions: {
            ecmaFeatures: { jsx: true },
          }
        },
        errors: [{ messageId: 'remove', line: 6 }],
        output: `
        function Component() {
          return (
            <div>
              <span></span>
              <span></span>
            </div>
          )
        }
        `,
      },
    ],
  },
}
