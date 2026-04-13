import { test } from 'eslint-rule-tester'

import { default as rule } from './export-name-after-file-name.mjs'

export default test(
	{
		rules: { 'export-name-after-file-name': rule },
	},
	{
		valid: [
			{
				code: `export { default as MyComponent } from './MyComponent.react'`,
			},
			{
				code: `export { default as SomethingElse } from './My-Component.react'`,
			},
			{
				code: `export { SomethingElse } from './MyComponent.react'`,
			},
			{
				code: `export * from './MyComponent.react'`,
			},
		],
		invalid: [
			{
				code: `export { default as Component } from './MyComponent.react'`,
				errors: [{ message: 'Expected the default export name "Component" to be after its file name "MyComponent"' }],
			},
		]
	}
)