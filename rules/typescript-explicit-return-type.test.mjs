import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './typescript-explicit-return-type.mjs'

export default test(
	{
		rules: { 'typescript-explicit-return-type': rule },
	},
	{
		valid: [
			{
				code: `
					const a = 1
					export const b = 2
				`,
			},
			{
				code: `
					function a() { return <div /> }
					const b = function () { return <div /> }
					const c = () => { return <div /> }
					const d = () => <div />
					const e = () => {
						if (true) return <div />
						else return ''
					}
				`,
				options: [{ allowJSX: true }],
			},
			{
				code: `
					function a(): string {}
					const b = function (): string {}
					const c = (): string => {}
					const d: () => string = () => {}
					const e = (): string => ''
				`,
			},
			{
				code: `
					function a() {}
					const b = function () {}
					const c = () => {}
					const d = () => ''
				`,
				options: [{ allowNonExports: true }],
			},
			{
				code: `
					function a() { return '' }
					const b = function () { return '' }
					const c = () => { return '' }
					const d = () => ''
				`,
				options: [{ allowSingleValueReturns: true }],
			},
			{
				code: `
					export function x() {
						if (a) return
						if (b) return undefined
						if (c) return void(0)
						return 1
					}
				`,
				options: [{ allowSingleValueReturns: true }],
			},
		],
		invalid: [
			{
				code: `
					function a() { return <div /> }
					const b = function () { return <div /> }
					const c = () => { return <div /> }
					const d = () => <div />
					const e = () => {
						if (true) return <div />
						else return ''
					}
				`,
				errors: [
					{ messageId: 'error', line: 2, column: 17, endColumn: 18 },
					{ messageId: 'error', line: 3 },
					{ messageId: 'error', line: 4 },
					{ messageId: 'error', line: 5 },
					{ messageId: 'error', line: 6 },
				],
			},
			{
				code: `
					export function a() {}
					export const b = function () {}
					export const c = () => {}
					export const d = () => ''
					const e = () => {}
					export { e }
				`,
				options: [{ allowNonExports: true }],
				errors: [
					{ messageId: 'error', line: 2 },
					{ messageId: 'error', line: 3 },
					{ messageId: 'error', line: 4 },
					{ messageId: 'error', line: 5 },
					{ messageId: 'error', line: 6 },
				],
			},
			{
				code: `
					function a() { return 1; }
					function b() {
						if (true) return 1;
						else return 2;
					}
				`,
				options: [{ allowSingleValueReturns: true }],
				errors: [{ messageId: 'error' }],
			},
			{
				code: `
					export default function a() {}
					const b = function () {}
					export default b
				`,
				options: [{ allowNonExports: true }],
				errors: [
					{ messageId: 'error', line: 2 },
					{ messageId: 'error', line: 3 },
				],
			},
		],
	},
	{
		languageOptions: {
			parser,
			parserOptions: {
				ecmaFeatures: { jsx: true },
			}
		},
	}
)