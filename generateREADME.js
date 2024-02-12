const fs = require('fs')
const _ = require('lodash')
const { rules } = require('./index.js')

let buffer = [
	'|Rule name|Description|Auto-fixable|',
	'|---|---|---|'
]

for (const ruleName in rules) {
	const rule = rules[ruleName]
	buffer.push('|`' + ruleName + '`|' + rule.meta.docs.description + '|' + (_.get(rule, 'meta.fixable') === 'code' ? 'Yes' : '') + '|')
}

fs.writeFileSync('./README.md', buffer.join('\n'), { encoding: 'utf-8', flush: true })
