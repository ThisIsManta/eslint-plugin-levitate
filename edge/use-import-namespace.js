'use strict'

const fs = require('fs')
const ts = require('typescript-eslint-parser');
const es = require('espree')
const { getImportFullPath } = require('./use-import-path-from-the-closest-index')

module.exports = {
  meta: {
    docs: {
      description: 'enforce importing using a namespace only if the target module does not export default',
      category: 'ECMAScript 6',
    },
  },
  create: function (context) {
    return {
      ImportDeclaration: function (root) {
        if (!root.specifiers || root.specifiers.length === 0) {
          return null
        }

        if (root.specifiers[0].type === 'ImportNamespaceSpecifier') {
          return null
        }

        const fullPath = getImportFullPath(context.getFilename(), root.source.value)
        if (/\.(js|ts)$/.test(fullPath) === false) {
          return null
        }

        let targetTree
        try {
          if (!context.parserPath || context.parserPath.toLowerCase() === 'espree') {
            targetTree = es.parse(fs.readFileSync(fullPath, 'utf-8'), context.parserOptions)
          } else if (context.parserPath === 'typescript-eslint-parser') {
            targetTree = ts.parse(fs.readFileSync(fullPath, 'utf-8'))
          }
        } catch (ex) {
          return null
        }
        if (!targetTree) {
          return null
        }

        if (targetTree.body.some(node => node.type === 'ExportDefaultDeclaration')) {
          return null
        }

        if (targetTree.body.some(node => node.type === 'ExportNamedDeclaration')) {
          return context.report({
            node: root.specifiers[0],
            message: `Expected to import a namespace.`,
          })
        }
      }
    }
  }
}
