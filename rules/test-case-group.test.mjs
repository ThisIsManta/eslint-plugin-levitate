import { test } from 'eslint-rule-tester'

import { default as rule } from './test-case-group.mjs'

export default test(
	{
		rules: { 'test-case-group': rule },
	},
	{
		valid: [
			{
				code: `
				describe('xxx')
				`,
			},
			{
				code: `
				describe('', function() {})
				describe('', () => {})
				`,
			},
			{
				code: `
				import { func } from 'xxx'
				describe('func', function() {
					it('xxx', function() {
						func()
					})
				})
				`,
			},
			{
				code: `
				import { func } from 'xxx'
				describe(func, function() {
					it('xxx', function() {
						func()
					})
				})
				`,
			},
			{
				code: `
				import { foo, bar } from 'xxx'
				describe('foo', function() {
					describe('bar', function() {
						it('xxx', function() {
							foo()
							bar()
						})
					})
				})
				`,
			},
			{
				code: `
				import { object } from 'xxx'
				describe('object', function() {
					it('xxx', function() {
						expect(object).toEqual({})
					})
				})
				`,
			},
			{
				code: `
				import * as Namespace from 'xxx'
				describe('Namespace.property.func', function() {
					it('xxx', function() {
						expect(Namespace.property.func())
					})
				})
				`,
			},
			{
				code: `
				import * as Namespace from 'xxx'
				describe(Namespace.func, function() {
					it('xxx', function() {
						expect(Namespace.func())
					})
				})
				`,
			},
			{
				code: `
				import * as Namespace from 'xxx'
				describe('func', function() {
					it('xxx', function() {
						expect(Namespace.func())
					})
				})
				`,
			},
			{
				code: `
				import { func } from 'xxx'
				describe('func', function() {
					it('xxx', function() {
						expect(func.call())
					})
				})
				`,
			},
		],
		invalid: [
			{
				code: `
				import { doSomething } from 'xxx'
				describe('something else', function() {
					it('xxx', function() {
						doSomething()
					})
				})
				`,
				errors: [{ messageId: 'unexpected' }],
			},
			{
				code: `
				import { doSomething } from 'xxx'
				describe(doSomething, function() {
				})
				doSomething()
				`,
				errors: [{ messageId: 'unused' }],
			},
		],
	}
)