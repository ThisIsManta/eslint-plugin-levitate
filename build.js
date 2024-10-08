const fs = require('fs')
const fp = require('path')
const _ = require('lodash')

const rules = fs.readdirSync('./rules', { withFileTypes: true })
	.map(file => ({
		name: fp.basename(file.name, fp.extname(file.name)),
		path: './' + file.path + '/' + file.name
	}))

module.exports.rules = rules

const hint = 'Do not modify this file directly as it is auto-generated by `npm run build` command'

{
	const fileName = 'index.js'
	const fileText = `
module.exports = {
	meta: {
		name: '${require('./package.json').name}',
	},
	rules: {
		${rules.map(({ name, path }) => `'${name}': require('${path}')`).join(',\n		')}
	}
}
`.trim()

	fs.writeFileSync(fileName, fileText, { encoding: 'utf-8', flush: true })

	const esbuild = require('esbuild')
	esbuild.buildSync({
		entryPoints: [fileName],
		outfile: fileName,
		allowOverwrite: true,
		platform: 'node',
		target: 'node20',
		bundle: true,
		packages: 'external',
		banner: {
			js: '// ' + hint
		},
		define: {
			// Strip off `tests` field from the final bundle
			// See https://esbuild.github.io/api/#define
			'process.env.TEST': 'undefined'
		}
	})

	console.log(fileName)
}

{
	const fileName = 'README.md'
	const fileText = [
		`<!-- ${hint} -->`,
		'',
		'Note that 🔧 indicates the rule is [auto-fixable](https://eslint.org/docs/latest/use/command-line-interface#--fix).',
		'',
		'|Rule|Description|',
		'|---|---|',
		...rules.map(({ name, path }) => {
			const rule = require(path)

			return [
				'',
				('`' + name + '` ' + (_.get(rule, 'meta.fixable') ? '🔧' : '')).trim(),
				rule.meta.docs.description,
				''
			].join('|')
		})
	].join('\n')

	fs.writeFileSync(fileName, fileText, { encoding: 'utf-8', flush: true })

	console.log(fileName)
}