// @ts-check

import fp from 'path'
import _ from 'lodash'

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		docs: {
			description: 'enforce sorting ESLint rules alphabetically in the configuration files.',
		},
	},
	create(context) {
		const fileName = fp.basename(context.filename)
		if (
			'oxlint.config.ts' !== fileName &&
			!/^eslint\.config\.(m|c)?(js|ts)$/.test(fileName) &&
			!/^\.eslintrc\.c?js?$/.test(fileName)
		) {
			return {}
		}

		return {
			Property(root) {
				if (
					root.key.type !== 'Identifier' ||
					root.key.name !== 'rules' ||
					root.value.type !== 'ObjectExpression'
				) {
					return
				}

				const rawRuleList = _.compact(
					root.value.properties.map((node) => {
						if (node.type !== 'Property') {
							return null
						}

						if (node.key.type === 'Identifier') {
							return { name: node.key.name, node }
						}

						if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
							return { name: node.key.value, node }
						}

						return null
					})
				)

				const nameRuleHash = _.groupBy(rawRuleList, ({ name }) => name)
				for (const name in nameRuleHash) {
					const ruleList = nameRuleHash[name]
					if (ruleList.length > 1) {
						for (const rule of ruleList) {
							context.report({
								node: rule.node.key,
								message: `Unexpected duplicate rule "${name}".`,
							})
						}
					}
				}

				const sortedRuleList = _.sortBy(
					rawRuleList,
					// Put built-in rules first
					({ name }) => (name.includes('/') ? 2 : 1),
					// Sort alphabetically
					({ name }) => name.replace(/\//g, '!')
				)

				for (let index = 0; index < sortedRuleList.length; index++) {
					if (sortedRuleList[index] !== rawRuleList[index]) {
						context.report({
							node: sortedRuleList[index].node.key,
							message:
								`Expected the rule "${sortedRuleList[index].name}" ` +
								(index === 0
									? `to be placed before "${rawRuleList[index].name}"`
									: `to be placed immediately after "${sortedRuleList[index - 1].name}"`) +
								'.',
						})

						return
					}
				}

				const ruleGroups = Object.values(
					_.groupBy(sortedRuleList, ({ name }) => (name.includes('/') ? name.split('/')[0] : ''))
				)

				const lines = context.sourceCode.getLines()
				for (let index = 1; index < ruleGroups.length; index++) {
					const prevNode = ruleGroups[index - 1].at(-1)?.node
					const thisNode = ruleGroups[index].at(0)?.node
					if (!prevNode?.loc || !thisNode?.loc) {
						continue
					}

					const emptyLines = lines
						.slice(prevNode.loc.end.line, thisNode.loc.start.line - 1)
						.filter((line) => line.trim() === '')

					if (emptyLines.length === 0) {
						context.report({
							node: thisNode.key,
							message: `Expected an empty line before the rule "${ruleGroups[index][0].name}".`,
						})
					}
				}

				for (const ruleList of ruleGroups) {
					for (let index = 1; index < ruleList.length; index++) {
						const prevNode = ruleList[index - 1].node
						const thisNode = ruleList[index].node
						if (!prevNode.loc || !thisNode.loc) {
							continue
						}

						const emptyLines = lines
							.slice(prevNode.loc.end.line, thisNode.loc.start.line - 1)
							.filter((line) => line.trim() === '')

						if (emptyLines.length > 0) {
							context.report({
								loc: { start: prevNode.loc.end, end: thisNode.loc.start },
								message: 'Unexpected an empty line here.',
							})
						}
					}
				}
			},
		}
	},
}
