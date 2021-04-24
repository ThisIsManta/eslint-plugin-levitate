const TestRunner = require('eslint').RuleTester
const ruleList = require('./rules')

ruleList
	.filter(name => process.argv.length > 2 ? process.argv.includes(name) : true)
	.forEach(function (name) {
		const rule = require('./edge/' + name)
		if (rule.tests) {
			console.log('✅ ' + name)
			new TestRunner({
				parserOptions: { ecmaVersion: 6, sourceType: 'module' }
			}).run(name, rule, rule.tests)
		} else {
			console.log('⛔ ' + name)
		}
	})
console.log('Done')
