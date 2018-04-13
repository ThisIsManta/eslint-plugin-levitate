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

        const fullPath = getImportFullPath(context.getFilename(), relativePath)
        if (fullPath === null) {
          return null
        }

        const rootPath = process.cwd()
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
  },
  getImportFullPath,
}

function getImportFullPath(currentFullPath, importRelativePath) {
  const supportedExtensions = pt.extname(currentFullPath) === '.ts' ? ['.ts', '.js'] : ['.js']

  const fullPath = pt.resolve(pt.dirname(currentFullPath), importRelativePath)
  if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
    for (const extension of supportedExtensions) {
      const actualPath = pt.join(fullPath, 'index' + extension)
      if (fs.existsSync(actualPath)) {
        return actualPath
      }
    }

  } else if (pt.extname(fullPath) === '') {
    for (const extension of supportedExtensions) {
      if (fs.existsSync(fullPath + extension)) {
        return fullPath + extension
      }
    }
  }

  if (fs.existsSync(fullPath) === false || fullPath === undefined) {
    return null
  }
}