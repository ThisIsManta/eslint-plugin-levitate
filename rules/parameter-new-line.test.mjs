import { test } from 'eslint-rule-tester'

import { default as rule } from './parameter-new-line.mjs'

export default test(
	{
		rules: { 'parameter-new-line': rule },
	},
	{
		valid: [
			{
				code: `
				function f() {}
				f()
				new Goo()
        `,
			},
			{
				code: `
				function f(a, b, c) {}
				const g = function (a, b, c) {}
				const h = (a, b, c) => {}
				f(a, b, c)
				new Goo(a, b, c)
        `,
			},
			{
				code: `
				function f(
					a,
					b,
					c,
				) {}
				f(
					a,
					b,
					c,
				)
				new Goo(
					a,
					b,
					c,
				)
        `,
			},
			{
				code: `
				function f(
					// Comment
					a,
				) {}
				f(
					// Comment
					a,
				)
        `,
			},
			{
				code: `
				beforeEach(() => {
				})
				it('test title', () => {
				}, { timeout: 30000 })
				after(
					// Comment
					() => {}
				)
				`,
			},
			{
				code: `
				sortBy(
					identifiers,
					item => item
				)
				`
			},
		],
		invalid: [
			{
				code: `
				function f(a, b,
				c) {}
				f(a, b,
				c)
				`,
				errors: [
					{ messageId: 'add', line: 2, column: 16 },
					{ messageId: 'add', line: 2, column: 19 },
					{ messageId: 'add', line: 3, column: 6 },
					{ messageId: 'add', line: 4, column: 7 },
					{ messageId: 'add', line: 4, column: 10 },
					{ messageId: 'add', line: 5, column: 6 },
				],
				output: `
				function f(
a, 
b,
				c
) {}
				f(
a, 
b,
				c
)
				`,
			},
			{
				code: `
				function f(
					a, b, c = ()=>{
					},
				) {}
				f(
					a, b, ()=>{
					},
				)
				`,
				errors: [
					{ messageId: 'remove', line: 2, column: 16 },
					{ messageId: 'remove', line: 4, column: 8 },
					{ messageId: 'remove', line: 6, column: 7 },
					{ messageId: 'remove', line: 8, column: 8 },
				],
				output: `
				function f(a, b, c = ()=>{
					}) {}
				f(a, b, ()=>{
					})
				`,
			},
			{
				code: `
				function f(// Comment
					a) {}
				f(// Comment
					a)
				`,
				errors: [
					{ messageId: 'add', line: 2, column: 16 },
					{ messageId: 'add', line: 3, column: 7 },
					{ messageId: 'add', line: 4, column: 7 },
					{ messageId: 'add', line: 5, column: 7 },
				],
				output: `
				function f(
// Comment
					a
) {}
				f(
// Comment
					a
)
				`,
			},
			{
				code: `
				function f(/* Comment */a
				) {}
				f(/* Comment */a
				)
        `,
				errors: [
					{ messageId: 'add', line: 2, column: 16 },
					{ messageId: 'add', line: 2, column: 29 },
					{ messageId: 'add', line: 4, column: 7 },
					{ messageId: 'add', line: 4, column: 20 },
				],
				output: `
				function f(
/* Comment */
a
				) {}
				f(
/* Comment */
a
				)
        `,
			},
			{
				code: `
				function f(/* Comment */

				// Comment
				
				a) {}
				f(/* Comment */

				// Comment

				a)
        `,
				errors: [
					{ messageId: 'add', line: 2, column: 16 },
					{ messageId: 'remove', line: 2, column: 29 },
					{ messageId: 'remove', line: 4, column: 15 },
					{ messageId: 'add', line: 6, column: 6 },
					{ messageId: 'add', line: 7, column: 7 },
					{ messageId: 'remove', line: 7, column: 20 },
					{ messageId: 'remove', line: 9, column: 15 },
					{ messageId: 'add', line: 11, column: 6 },
				],
				output: `
				function f(
/* Comment */
// Comment
a
) {}
				f(
/* Comment */
// Comment
a
)
        `,
			},
		],
	}
)