/// <reference path="../types.d.ts" />
// @ts-check

const _ = require('lodash')
const fs = require('fs')
const fp = require('path')

/**
 * @type {Rule & { getSupportedExtensions: typeof getSupportedExtensions, getImportFullPath: typeof getImportFullPath }}
 */
module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'enforce writing an import path pointing to the closest index file',
		},
	},
	create: function (context) {
		return {
			ImportDeclaration: function (root) {
				const importRelativePath = String(root.source.value)
				if (importRelativePath.startsWith('.') === false) {
					return null
				}

				const currentFullPath = context.getFilename()
				const importFullPath = getImportFullPath(currentFullPath, importRelativePath)
				if (importFullPath === null) {
					return null
				}

				const supportedExtensions = getSupportedExtensions(importFullPath)

				const repositoryPath = process.cwd()
				const importPartialPathFromRepository = importFullPath.substring(repositoryPath.length)
				const pathList = _.compact(importPartialPathFromRepository.split(/\\|\//))

				for (let count = 1; count <= pathList.length; count++) {
					const workPath = pathList.slice(0, count).join(fp.sep)
					for (const extension of supportedExtensions) {
						const indexFullPath = fp.join(repositoryPath, workPath, 'index' + extension)
						if (fs.existsSync(indexFullPath)) {
							if (currentFullPath.startsWith(fp.dirname(indexFullPath))) {
								return null
							}

							if (indexFullPath !== importFullPath) {
								const unixPath = _.trim(indexFullPath.substring(repositoryPath.length).replace(/\\/, '/'), '/')
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
	getSupportedExtensions,
	getImportFullPath,
}

/**
 * @param {string} currentFullPath
 * @return {Array<string>}
 */
function getSupportedExtensions(currentFullPath) {
	return fp.extname(currentFullPath) === '.ts'
		? ['.ts', '.tsx', '.js', '.jsx']
		: ['.js', '.jsx', '.ts', '.tsx']
}

/**
 * @param {string} currentFullPath
 * @param {string} importRelativePath
 * @return {string | null}
 */
function getImportFullPath(currentFullPath, importRelativePath) {
	const supportedExtensions = getSupportedExtensions(currentFullPath)

	const fullPath = fp.resolve(fp.dirname(currentFullPath), importRelativePath)
	if (fp.extname(fullPath) === '') {
		for (const extension of supportedExtensions) {
			if (fs.existsSync(fullPath + extension)) {
				return fullPath + extension
			}
		}
	}

	if (fs.existsSync(fullPath)) {
		if (fs.lstatSync(fullPath).isDirectory()) {
			for (const extension of supportedExtensions) {
				const actualPath = fp.join(fullPath, 'index' + extension)
				if (fs.existsSync(actualPath)) {
					return actualPath
				}
			}

		} else {
			return fullPath
		}
	}

	return null
}
