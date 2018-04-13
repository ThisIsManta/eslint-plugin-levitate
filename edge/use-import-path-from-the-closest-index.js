'use strict'

const _ = require('lodash')
const fs = require('fs')
const pt = require('path')

module.exports = {
  meta: {
    docs: {
      description: 'enforce importing the closest index file',
      category: 'ECMAScript 6',
    },
  },
  create: function (context) {
    return {
      ImportDeclaration: function (root) {
        const relativePath = root.source.value
        if (relativePath.startsWith('.') === false) {
          return null
        }

        const rootPath = process.cwd()

        const supportedExtensions = pt.extname(context.getFilename()) === '.ts' ? [ '.ts', '.js' ] : [ '.js' ]

        let fullPath = pt.resolve(pt.dirname(context.getFilename()), relativePath)
        if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
          for (const extension of supportedExtensions) {
            const actualPath = pt.join(fullPath, 'index' + extension)
            if (fs.existsSync(actualPath)) {
              fullPath = actualPath
              break
            }
          }
        } else if (pt.extname(fullPath) === '') {
          for (const extension of supportedExtensions) {
            if (fs.existsSync(fullPath + extension)) {
              fullPath = fullPath + extension
              break
            }
          }
        }
        if (fs.existsSync(fullPath) === false || fullPath === undefined) {
          return null
        }

        const workPath = fullPath.substring(rootPath.length)

        const workPathList = _.compact(workPath.split(/\\|\//))
        for (let count = 1; count <= workPathList.length; count++) {
          const testPath = workPathList.slice(0, count).join(pt.sep)
          for (const extension of supportedExtensions) {
            const expectedPath = pt.join(rootPath, testPath, 'index' + extension)
            if (fs.existsSync(expectedPath)) {
              if (expectedPath !== fullPath) {
                const unixPath = _.trim(expectedPath.substring(rootPath.length).replace(/\\/, '/'), '/')
                return context.report({
                  node: root.source,
                  message: `Expected to import "${unixPath}".`,
                })
              }

              break
            }
          }
        }
      }
    }
  }
}
