import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './react-sort-props.mjs'

export default test(
	{
		rules: { 'react-sort-props': rule },
	},
	{
		valid: [
			{
				code: `
				type Props = {
					key: string
					ref: Ref
					id: string
					className: string
					contentClassName: string
					everythingElse: string
					onKeyUp: () => void
					onClick: () => void
					'data-name': string
				}
        function C(props: {
					key: string
					ref: Ref
					id: string
					className: string
					contentClassName: string
					everythingElse: string
					onKeyUp: () => void
					onClick: () => void
					'data-name': string
				}) {
					return (
						<div
							key=""
							ref={() => {}}
							id=""
							className=""
							contentClassName=""
							everythingElse=""
							onKeyUp=""
							onClick=""
							data-name=""
						/>
					)
				}
				`,
			},
			{
				code: `
        function C(props: {
					key: string
					onClick: () => void
					everythingElse: string
				}) {
					return (
						<div
							key=""
							onClick=""
							ref=""
							everythingElse=""
						/>
					)
				}
				`,
				options: [['key', 'on*']],
			},
			{
				code: `
        function C() {
					return (
						<div
							everythingElse=""
						/>
					)
				}
				`,
			},
			{
				code: `
        function C() {
					return (
						<div />
					)
				}
				`,
			},
			{
				code: `
        import React from 'react'
				const p1: React.ComponentProps<typeof C> = {
					key: '',
					ref: '',
					others: {
						key: '',
						ref: '',
					}
				}
				`,
			},
		],
		invalid: [
			{
				code: `
				type Props = {
					ref: Ref
					key: string
				}
				type SecondProps = {
					ref: Ref
					key: string
				}
				type ThirdProps = SecondProps & {
					ref: Ref
					key: string
				}
        function C(props: Props) {
					return (
						<div
							ref=""
							key=""
						/>
					)
				}
				`,
				output: `
				type Props = {
					key: string
					ref: Ref
				}
				type SecondProps = {
					key: string
					ref: Ref
				}
				type ThirdProps = SecondProps & {
					key: string
					ref: Ref
				}
        function C(props: Props) {
					return (
						<div
							key=""
							ref=""
						/>
					)
				}
				`,
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 3,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 7,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 11,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 17,
					},
				],
			},
			{
				code: `
        function C(props: {
					ref: Ref
					key: string
				}) {
					return (
						<div
							ref=""
							key=""
						/>
					)
				}
				`,
				output: `
        function C(props: {
					key: string
					ref: Ref
				}) {
					return (
						<div
							key=""
							ref=""
						/>
					)
				}
				`,
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 3,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 8,
					},
				],
			},
			{
				code: `
				type Props = {
					key: string
					onClick: () => void
					everythingElse: string
					onChange: () => void
					somethingElse: string
					className: string
					id: string
				}
        function C(props: Props) {
					return (
						<div
							key=""
							onClick=""
							everythingElse=""
							{...props}
							onChange=""
							somethingElse=""
							className=""
							id=""
						/>
					)
				}
				`,
				output: `
				type Props = {
					key: string
					id: string
					className: string
					everythingElse: string
					somethingElse: string
					onClick: () => void
					onChange: () => void
				}
        function C(props: Props) {
					return (
						<div
							key=""
							everythingElse=""
							onClick=""
							{...props}
							id=""
							className=""
							somethingElse=""
							onChange=""
						/>
					)
				}
				`,
				errors: [
					{
						message: 'Expected the prop `id` to be sorted here',
						line: 4,
					},
					{
						message: 'Expected the prop `everythingElse` to be sorted here',
						line: 15,
					},
					{
						message: 'Expected the prop `id` to be sorted here',
						line: 18,
					},
				],
			},
			{
				code: `
				type Props = {
					// Comment 1
					// Comment 2
					ref: string; // Comment 3
					/**
					 * Comment 4
					 */
					key: string // Comment 5
					// Comment 6
				}
				`,
				output: `
				type Props = {
					/**
					 * Comment 4
					 */
					key: string; // Comment 5
					// Comment 1
					// Comment 2
					ref: string // Comment 3
					// Comment 6
				}
				`,
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 5,
					}
				]
			},
			{
				code: `
				type Props = { ref: string; key: string }
				`,
				output: `
				type Props = { key: string; ref: string }
				`,
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 2,
					}
				]
			},
			{
				code: `
				import React from 'react'
				const p1: React.ComponentProps<typeof C> = { ref: string, key: string }
				const p2: React.ComponentProps<typeof C> = Object.assign({ ref: string, key: string }, { ref: string, key: string })
				const p3 = { ref: string, key: string } as React.ComponentProps<typeof C>
				function f1(p: React.ComponentProps<typeof C> = { ref: string, key: string }) {}
				function f2(): React.ComponentProps<typeof C> {
					const x = { ref: string, key: string }
					return { ref: string, key: string }
				}
				const f3 = (): React.ComponentProps<typeof C> => ({ ref: string, key: string })
				`,
				output: `
				import React from 'react'
				const p1: React.ComponentProps<typeof C> = { key: string, ref: string }
				const p2: React.ComponentProps<typeof C> = Object.assign({ key: string, ref: string }, { key: string, ref: string })
				const p3 = { key: string, ref: string } as React.ComponentProps<typeof C>
				function f1(p: React.ComponentProps<typeof C> = { key: string, ref: string }) {}
				function f2(): React.ComponentProps<typeof C> {
					const x = { ref: string, key: string }
					return { key: string, ref: string }
				}
				const f3 = (): React.ComponentProps<typeof C> => ({ key: string, ref: string })
				`,
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 3,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 4,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 4,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 5,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 6,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 9,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 11,
					},
				]
			},
			{
				code: `
				import { ComponentProps } from 'react'
				const p1: ComponentProps<typeof C> = { ref: string, key: string }
				const p2: ComponentProps<typeof C> = Object.assign({ ref: string, key: string }, { ref: string, key: string })
				const p3 = { ref: string, key: string } as ComponentProps<typeof C>
				function f1(p: ComponentProps<typeof C> = { ref: string, key: string }) {}
				function f2(): ComponentProps<typeof C> {
					const x = { ref: string, key: string }
					return { ref: string, key: string }
				}
				const f3 = (): ComponentProps<typeof C> => ({ ref: string, key: string })
				`,
				output: `
				import { ComponentProps } from 'react'
				const p1: ComponentProps<typeof C> = { key: string, ref: string }
				const p2: ComponentProps<typeof C> = Object.assign({ key: string, ref: string }, { key: string, ref: string })
				const p3 = { key: string, ref: string } as ComponentProps<typeof C>
				function f1(p: ComponentProps<typeof C> = { key: string, ref: string }) {}
				function f2(): ComponentProps<typeof C> {
					const x = { ref: string, key: string }
					return { key: string, ref: string }
				}
				const f3 = (): ComponentProps<typeof C> => ({ key: string, ref: string })
				`,
				errors: [
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 3,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 4,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 4,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 5,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 6,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 9,
					},
					{
						message: 'Expected the prop `key` to be sorted here',
						line: 11,
					},
				]
			},
		],
	},
	{
		languageOptions: {
			parser,
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
		},
	}
)