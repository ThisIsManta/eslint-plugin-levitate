import { test } from 'eslint-rule-tester'

import { default as rule } from './consecutive-block-new-line.mjs'

export default test(
	{
		rules: { 'consecutive-block-new-line': rule },
	},
	{
		valid: [
			{
				code: `
				function f() {}
				function g() {
				}
				function h() {

				}
				function i() {
					// Comment
				}
				function j() { // Comment
				}
				`,
			},
			{
				code: `
				if (a) {}
				if (a) {
				}
				if (a) {
					// Comment
				}
				`,
			},
			{
				code: `
				if (a) {
					// Comment

				} else {
					// Comment
				}
				`,
			},
			{
				code: `
				try {
					// Comment

				} catch {
					// Comment
				}
				`,
			},
		],
		invalid: [
			{
				code: `
				if (a) {
					// Comment
				} else {
					// Comment

				}
				`,
				errors: [
					{ messageId: 'add', line: 4, column: 5 },
					{ messageId: 'remove', line: 6, column: 1 },
				],
				output: `
				if (a) {
					// Comment

				} else {
					// Comment
				}
				`,
			},
			{
				code: `
				try {
					// Comment
				} catch {
					// Comment

				}
				`,
				errors: [
					{ messageId: 'add', line: 4, column: 5 },
					{ messageId: 'remove', line: 6, column: 1 },
				],
				output: `
				try {
					// Comment

				} catch {
					// Comment
				}
				`,
			},
			{
				code: `
				function f() {

					// Comment
				
				}
				`,
				errors: [
					{ messageId: 'remove', line: 3, column: 1 },
					{ messageId: 'remove', line: 5, column: 1 },
				],
				output: `
				function f() {
					// Comment
				}
				`,
			},
			{
				code: `
				switch (a) {
					case 1: // Comment

					case 2: {
						// Comment
					} // Comment
					default: {
						// Comment

					}
				}
				`,
				errors: [
					{ messageId: 'remove', line: 4, column: 1 },
					{ messageId: 'add', line: 7, column: 6 },
					{ messageId: 'remove', line: 10, column: 1 },
				],
				output: `
				switch (a) {
					case 1: // Comment
					case 2: {
						// Comment

					} // Comment
					default: {
						// Comment
					}
				}
				`,
			},
		],
	}
)