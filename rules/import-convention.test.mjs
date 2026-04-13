import fp from 'path'

import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './import-convention.mjs'

export default test(
	{
		rules: { 'import-convention': rule },
	},
	{
		valid: [
			{
				code: `import XXX from 'xxx'`,
				options: [{ path: 'aaa', default: false }, { path: 'bbb', default: false }],
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', default: true }],
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', default: 'AAA' }],
			},
			{
				code: `import aaa from 'aaa'`,
				options: [{ path: '(.*)', default: '$1' }],
			},
			{
				code: ``,
				options: [{ path: 'aaa', namespace: false }],
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', namespace: true }],
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', namespace: 'AAA' }],
			},
			{
				code: `import * as aaa from 'aaa'`,
				options: [{ path: '(.*)', namespace: '$1' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', named: false }],
			},
			{
				code: `import AAA from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
			},
			{
				code: `import * as AAA from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
			},
			{
				code: `import { XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'XXX' }] }],
			},
			{
				code: `import { aaa } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: false }] }],
			},
			{
				code: `import { aaa as AAA } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: 'AAA' }] }],
			},
			{
				code: `import { useState as makeState } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: '^use(\\w+)', rename: 'make$1' }] }],
			},
			{
				code: `import React, { useEffect } from 'react'`,
				options: [{ path: 'react', default: 'React', named: [{ name: /^use\W+/ }] }],
			},
			{
				code: `
					import React from 'react'
					import moment from 'moment'
				`,
				filename: fp.join(import.meta.dirname, 'import-convention.js'),
				options: [{ path: '.*', default: true }],
			},
			{
				code: `
					import React from 'react'
					function MyComponent() {
						const state = React.useState()
						React.useMemo()
						React.memo()
					}
				`,
				options: [{ path: 'react', default: 'React', named: false }],
			},
			{
				code: `
					import React, { useState, useMemo } from 'react'
					function MyComponent() {
						const state = useState()
						useMemo()
						React.memo()
					}
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }] }],
			},
			{
				code: `
					const React = require('react')
					const useState = require('react').useState
					const useMemo = require('react').useMemo
					const { useCallback } = require('react')
					function MyComponent() {
						const state = useState()
						useMemo()
						useCallback()
						React.memo()
					}
					import _ from 'lodash'
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }] }, { path: '^lodash$', default: true, namespace: true }],
			},
		],
		invalid: [
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: 'aaa', default: false }],
				errors: [{ message: 'Unexpected the default import.' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', default: true }],
				errors: [{ message: 'Expected the default import.' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: 'aaa', default: 'AAA' }],
				errors: [{ message: 'Expected the default import to be "AAA".' }],
			},
			{
				code: `import XXX from 'aaa'`,
				options: [{ path: '(.*)', default: '$1' }],
				errors: [{ message: 'Expected the default import to be "aaa".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: false }],
				errors: [{ message: 'Unexpected the namespace import.' }],
			},
			{
				code: `import 'aaa'`,
				options: [{ path: 'aaa', namespace: true }],
				errors: [{ message: 'Expected the namespace import.' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: 'aaa', namespace: 'AAA' }],
				errors: [{ message: 'Expected the namespace import to be "AAA".' }],
			},
			{
				code: `import * as XXX from 'aaa'`,
				options: [{ path: '(.*)', namespace: '$1' }],
				errors: [{ message: 'Expected the namespace import to be "aaa".' }],
			},
			{
				code: `import { AAA } from 'aaa'`,
				options: [{ path: 'aaa', named: false }],
				errors: [{ message: 'Unexpected any named imports.' }],
			},
			{
				code: `import { aaa as XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: false }] }],
				errors: [{ message: 'Expected the named import to be "aaa".' }],
			},
			{
				code: `import { aaa as XXX } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', rename: 'AAA' }] }],
				errors: [{ message: 'Expected the named import to be "AAA".' }],
			},
			{
				code: `import { useState } from 'react'`,
				options: [{ path: '^react$', named: [{ name: '^use(\\w+)$', rename: 'make$1' }] }],
				errors: [{ message: 'Expected the named import to be "makeState".' }],
			},
			{
				code: `import { aaa } from 'aaa'`,
				options: [{ path: 'aaa', named: [{ name: 'aaa', forbidden: true }] }],
				errors: [{ message: 'Unexpected the named import "aaa".' }],
			},
			{
				code: `import React, { memo } from 'react'`,
				options: [{ path: 'react', default: 'X', named: [{ name: '^(?!use)', forbidden: true }] }],
				errors: [
					{ message: 'Expected the default import to be "X".' },
					{ message: 'Unexpected the named import "memo".' },
				],
			},
			{
				code: `
					import react from 'react'
				`,
				filename: fp.join(import.meta.dirname, 'import-convention.js'),
				options: [{ path: '.*', default: 'React' }],
				errors: [
					{ message: 'Expected the default import to be "React".' },
				],
			},
			{
				code: `
					import React from 'react'
					function MyComponent() {
						const state = React.useState()
						React.useMemo()
						React.memo()
					}
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }] }],
				errors: [
					{ message: 'Expected "useState" to be imported directly.' },
					{ message: 'Expected "useMemo" to be imported directly.' },
				],
			},
			{
				code: `
					const React = require('react')
					const { memo } = require('react')
					function MyComponent() {
						const state = React.useState()
						React.useMemo()
						React.useCallback()
						memo()
					}
					const { get } = require('lodash')
				`,
				options: [{ path: 'react', default: 'React', named: [{ name: '^use' }, { name: '.*', forbidden: true }] }, { path: '^lodash$', default: true, namespace: true }],
				errors: [
					{ message: 'Unexpected the named import "memo".' },
					{ message: 'Expected "useState" to be imported directly.' },
					{ message: 'Expected "useMemo" to be imported directly.' },
					{ message: 'Expected "useCallback" to be imported directly.' },
					{ message: 'Expected the default import.' },
				],
			},
		]
	},
	{
		languageOptions: {
			parser,
		},
	}
)