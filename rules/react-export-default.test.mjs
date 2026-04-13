import { test } from 'eslint-rule-tester'

import { default as rule } from './react-export-default.mjs'

export default test(
	{
		rules: { 'react-export-default': rule },
	},
	{
		valid: [
			{
				code: `
				const Y = function () { return false }
				export default function A() { return <div></div> }
				`,
				filename: 'A.js',
			},
			{
				code: `
				import React from 'react'
				export default class A extends React.Component {}
				`,
				filename: 'A.js',
			},
			{
				code: `
				import React from 'react'
				import SomethingElse from 'something-else'
				export default class A extends React.PureComponent {}
				`,
				filename: 'A.js',
			},
			{
				code: `
				import { Component } from 'react'
				export default class A extends Component {}
				`,
				filename: 'A.js',
			},
			{
				code: `
				import { PureComponent } from 'react'
				export default class A extends PureComponent {}
				`,
				filename: 'A.js',
			},
			{
				code: `
				const React = require('react')
				export default class A extends React.Component {}
				`,
				filename: 'A.js',
			},
			{
				code: `
				const React = require('react')
				export default class A extends React.PureComponent {}
				`,
				filename: 'A.js',
			},
			{
				code: `
				const { Component } = require('react')
				export default class A extends Component {}
				`,
				filename: 'A.js',
			},
			{
				code: `
				const { PureComponent } = require('react')
				export default class A extends PureComponent {}
				`,
				filename: 'A.js',
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default enhance(A)
				`,
				filename: 'A.js',
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default () => <A />
				`,
				filename: 'A.js',
			},
			{
				code: `
				export function A(props) { return <div></div> }
				export default () => <A />
				`,
				filename: 'A.js',
			},
			{
				code: `
				export default function A(props) { return <div></div> }
				`,
				filename: 'A.js',
			},
			{
				code: `
				export default function A(props) {
					const renderSomething = () => (
						<div></div>
					)
					return <div>{renderSomething()}</div>
				}
				`,
				filename: 'A.js',
			},
			{
				code: `
				const A = React.memo(() => <div></div>)
				export default () => <A />
				`,
				filename: 'A.js',
			},
			{
				code: `
				function A() { return <div></div> }
				export default React.memo(() => { return <A/> })
				`,
				filename: 'A.js',
			},
			{
				code: `
				const A = React.memo(() => { return <div></div> })
				export default () => <A />
				`,
				filename: 'A.js',
			},
			{
				code: `
				export const A = React.memo(() => { return <div></div> })
				export default () => <A />
				`,
				filename: 'A.js',
			},
		],
		invalid: [
			{
				code: `
				const x = 123
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected to have a React component named "A"',
					},
				],
			},
			{
				code: `
				const X = function () { return <div></div> }
				const Y = () => { return <div></div> }
				const Z = () => <div></div>
				export default function A() { return <div></div> }
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected the React component to be written as `function X(props) {...}`',
						line: 2,
					},
					{
						message: 'Expected the React component to be written as `function Y(props) {...}`',
						line: 3,
					},
					{
						message: 'Expected the React component to be written as `function Z(props) {...}`',
						line: 4,
					},
				],
			},
			{
				code: `
				export default (props) => <div></div>
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected to have a React component named "A"',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default (props) => { return <A /> }
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected the arrow function to return the value by using the shorthand syntax',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected `export default` to be here',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default A//EOL
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected `export default` to be here',
					},
				],
				output: `
				export default function A(props) { return <div></div> }
				//EOL
				`,
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default class B extends React.Component {}
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected an enhanced component to render the React component named "A"',
					},
					{
						message: 'Expected an enhanced component to be written as an arrow function',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default class B extends React.PureComponent { render() { return <A /> } }
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected an enhanced component to be written as an arrow function',
					},
				],
			},
			{
				code: `
				function A(props) { return <div></div> }
				export default function B(props) {}
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected an enhanced component to render the React component named "A"',
					},
					{
						message: 'Expected an enhanced component to be written as an arrow function',
					},
				],
			},
			{
				code: `
				export default function A(props) { return <div></div> }
				const B = React.memo(function C() { return <div></div> })
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected a React component argument to be written as an arrow function',
					},
				],
			},
			{
				code: `
				export function A(props) { return <div></div> }
				export default A
				`,
				filename: 'A.js',
				errors: [
					{
						message: 'Expected `export default` to be here',
						line: 2,
						column: 12,
					},
				],
			},
		],
	},
	{
		languageOptions: {
			parserOptions: {
				ecmaFeatures: { jsx: true },
			}
		},
	}
)