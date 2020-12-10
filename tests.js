const TestRunner = require('eslint').RuleTester
const ruleList = require('./rules')

ruleList.forEach(function (name) {
	const rule = require('./edge/' + name)
	if (rule.tests) {
		console.log('✅ ' + name)
		new TestRunner().run(name, rule, rule.tests)
	} else {
		console.log('⛔ ' + name)
	}
})
console.log('Done')
