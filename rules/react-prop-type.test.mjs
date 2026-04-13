import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './react-prop-type.mjs'

export default test(
	{
		rules: { 'react-prop-type': rule },
	},
	{
		valid: [
			{
				code: `
        function A(props: Props) {}
        const B = function (props: Props) {}
        const C = (props: Props) => {}
        `,
			},
			{
				code: `
        function A(param) {}
        const B = function (param) {}
        const C = (param) => {}
        `,
			},
			{
				code: `
        class X {
          constructor(props) {}
        }
        `,
			},
			{
				code: `
        compose(withSelectors(props => ({})))
        `,
			},
			{
				code: `
        const enhance = props => {}
        `,
			},
		],
		invalid: [
			{
				code: `
        function A(props) {}
        `,
				errors: [
					{
						message: 'Expected to have type definition',
					},
				],
			},
		],
	},
	{
		languageOptions: {
			parser,
		},
	}
)