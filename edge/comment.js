'use strict'

const _ = require('lodash')

const FORMAL = /^\s(HACK|TODO):(\s\S|$)/
const HACK = /^\s*(HACK|XXX)\W\s*/i
const TODO = /^\s*TODO\W\s*/i
const FIXME = /^\s*FIXME\W\s*/i
const NOTE = /^\s*(Note\W)\s/i
const URL = /^\s\w+:\/\/.+/

module.exports = {
  meta: {
    docs: {
      description: 'enforce starting a single-line comment with either `TODO:`, `HACK:`, `See {url}`, or a first-capitalized word',
      category: 'Stylistic Issues',
    },
    fixable: 'code',
  },
  create: function(context) {
    return {
      Program: function(root) {
        _.chain(root.comments)
          .filter(node => node.type === 'Line')
          .forEach((node, index, array) => {
            if (FORMAL.test(node.value)) {
              return null
            }

            if (HACK.test(node.value)) {
              return context.report({
                node,
                message: `Expected the comment to be written as "HACK: ..."`,
                fix: fixer =>
                  fixer.replaceText(
                    node,
                    node.value.replace(HACK, '// HACK: ').trim()
                  ),
              })
            }

            if (TODO.test(node.value)) {
              return context.report({
                node,
                message: `Expected the comment to be written as "TODO: ..."`,
                fix: fixer =>
                  fixer.replaceText(
                    node,
                    node.value.replace(TODO, '// TODO: ').trim()
                  ),
              })
            }

            if (FIXME.test(node.value)) {
              return context.report({
                node,
                message: `Expected the comment to be written as "TODO: ..."`,
                fix: fixer =>
                  fixer.replaceText(
                    node,
                    node.value.replace(FIXME, '// TODO: ').trim()
                  ),
              })
            }

            if (URL.test(node.value)) {
              return context.report({
                node,
                message: `Expected the comment to be written as "See ${node.value.trim()}"`,
                fix: fixer => fixer.replaceText(node, '// See' + node.value),
              })
            }

            if (NOTE.test(node.value)) {
              return context.report({
                node,
                message: `Unexpected "${node.value.match(NOTE)[1].trim()}"`,
                fix: fixer =>
                  fixer.replaceText(
                    node,
                    node.value.replace(NOTE, '// ').trim()
                  ),
              })
            }

            // Skip if this is a part of consecutive single-line comments
            if (
              index > 0 &&
              node.loc.start.line === array[index - 1].loc.start.line + 1
            ) {
              return null
            }

            // Skip if this is a single word or an ESLint instruction
            const text = node.value.trim()
            if (
              text.includes(' ') === false ||
              text.startsWith('eslint-disable')
            ) {
              return null
            }

            // Capitalize the first word
            const firstChar = text.charAt(0)
            if (firstChar !== firstChar.toUpperCase()) {
              return context.report({
                node,
                message: `Expected the comment to start with a capital letter`,
                fix: fixer =>
                  fixer.replaceText(
                    node,
                    node.value.replace(
                      new RegExp('^\\s*' + _.escapeRegExp(firstChar) + '\\s*'),
                      '// ' + firstChar.toUpperCase()
                    )
                  ),
              })
            }
          })
          .value()
      },
    }
  },
  tests: {
    valid: ['// HACK: lorem', '// TODO: lorem', '// Lorem'],
    invalid: [
      {
        code: '// Hack lorem',
        errors: [
          {
            message: 'Expected the comment to be written as "HACK: ..."',
          },
        ],
        output: '// HACK: lorem',
      },
      {
        code: '// XXX: lorem',
        errors: [
          {
            message: 'Expected the comment to be written as "HACK: ..."',
          },
        ],
        output: '// HACK: lorem',
      },
      {
        code: '// Todo: lorem',
        errors: [
          {
            message: 'Expected the comment to be written as "TODO: ..."',
          },
        ],
        output: '// TODO: lorem',
      },
      {
        code: '// FIXME: lorem',
        errors: [
          {
            message: 'Expected the comment to be written as "TODO: ..."',
          },
        ],
        output: '// TODO: lorem',
      },
      {
        code: '// http://www.example.com/xxx',
        errors: [
          {
            message:
              'Expected the comment to be written as "See http://www.example.com/xxx"',
          },
        ],
        output: '// See http://www.example.com/xxx',
      },
      {
        code: '// Note: lorem',
        errors: [
          {
            message: 'Unexpected "Note:"',
          },
        ],
        output: '// lorem',
      },
      {
        code: ['// lorem ipsum', '// dolor sit'].join('\n'),
        errors: [
          {
            message: 'Expected the comment to start with a capital letter',
          },
        ],
        output: ['// Lorem ipsum', '// dolor sit'].join('\n'),
      },
    ],
  },
}
