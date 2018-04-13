const TestRunner = require('eslint').RuleTester
const ruleList = require('./rules')

ruleList.forEach(function (name) {
	const rule = require('./edge/' + name)
	console.log('Testing ' + name)
	if (rule.test) {
		new TestRunner().run(name, rule, rule.test)
	}
})
