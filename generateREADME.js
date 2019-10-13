const fs = require('fs')
const _ = require('lodash')
const rules = require('./rules')

let buffer = [
	'|Rule name|Description|Auto-fixable|',
	'|---|---|---|'
]

for (const ruleName of rules) {
	const rule = require('./edge/' + ruleName)
	buffer.push('|`' + ruleName + '`|' + rule.meta.docs.description + '|' + (_.get(rule, 'meta.fixable') === 'code' ? 'Yes' : '') + '|')
}

fs.writeFileSync('./README.md', buffer.join('\n'), 'utf-8')
