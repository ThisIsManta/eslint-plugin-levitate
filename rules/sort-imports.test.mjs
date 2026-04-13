import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './sort-imports.mjs'

export default test(
	{
		rules: { 'sort-imports': rule },
	},
	{
		valid: [
			{
				code: `
import crypto from 'crypto'

import Config from '../../config/main'
import UserConstants from './UserConstants'
				`,
				options: ['module'],
			},
			{
				code: `
import 'a'
import 'c'
import 'b'

import './a'
import './c'
import './b'

import { readFile, writeFile } from 'fs'
import * as path from 'path'

import classNames from 'classnames'
import _ from 'lodash'
import Moment from 'moment'
import React from 'react'
import ReactDOM from 'react-dom'

import aaa from '../../aaa'
import bbb from '../../bbb'
import aaaa from '../aaaa'
import bbbb from '../bbbb'
import aaaaa from './aaaaa'
import bbbbb from './bbbbb'
				`,
				options: ['module'],
			},
			{
				code: `
import React from 'react'
import ReactDOM from 'react-dom'
import classNames from 'classnames'
import { readFile, writeFile } from 'fs'
import _ from 'lodash'
import Moment from 'moment'
import * as path from 'path'

import aaa from '../../aaa'
import bbb from '../../bbb'
import aaaa from '../aaaa'
import bbbb from '../bbbb'
import aaaaa from './aaaaa'
import bbbbb from './bbbbb'

import './a'
import './b'
import './c'
import 'a'
import 'b'
import 'c'
				`,
				options: ['manta'],
			},
			{
				code: `
import 'a' /*
xxx
*/
// Note
// @ts-ignore
import 'b'
				`,
				options: ['manta'],
			},
		],
		invalid: [
			{
				code: `
import 'aa'
const e = 3.14
import 'bb'
				`,
				errors: [{ message: 'Expected import statements to be placed consecutively.' }],
				output: `
import 'aa'
import 'bb'

const e = 3.14
				`
			},
			{
				code: `
import aa from 'aa'
import * as path from 'path'
import { readFile, writeFile } from 'fs'
import bbbbb from './bbbbb'
import bbbb from '../bbbb'
import bbb from '../../bbb'
import aaaaa from './aaaaa'
import aaaa from '../aaaa'
import aaa from '../../aaa'
import './a'
import 'a'
				`,
				options: ['module'],
				errors: [{ message: 'Expected this import statement to be placed after "path".' }],
				output: `
import 'a'

import './a'

import { readFile, writeFile } from 'fs'
import * as path from 'path'

import aa from 'aa'

import aaa from '../../aaa'
import bbb from '../../bbb'
import aaaa from '../aaaa'
import bbbb from '../bbbb'
import aaaaa from './aaaaa'
import bbbbb from './bbbbb'
				`,
			},
			{
				code: `
import 'a'
import './a'
				`,
				options: ['module'],
				errors: [{ message: 'Expected a blank line before this import statement.' }],
				output: `
import 'a'

import './a'
				`,
			},
			{
				code: `
import './a'

import './b'
				`,
				options: ['module'],
				errors: [{ message: 'Unexpected a blank line before this import statement.' }],
				output: `
import './a'
import './b'
				`,
			},
			{
				code: `
// Hack
import 'b' /*
xxx
*/
// Note
// @ts-ignore
import 'a'
				`,
				options: ['manta'],
				errors: [{ message: 'Expected this import statement to be placed after "a".' }],
				output: `
// Note
// @ts-ignore
import 'a'
// Hack
import 'b' /*
xxx
*/
				`
			},
			{
				code: `
// Hack
import 'a' /*
xxx
*/
// Note
// @ts-ignore
import React from 'react'
				`,
				options: ['manta'],
				errors: [{ message: 'Expected this import statement to be placed after "react".' }],
				output: `
// Note
// @ts-ignore
import React from 'react'

// Hack
import 'a' /*
xxx
*/
				`
			},
		]
	},
	{
		languageOptions: {
			parser,
		},
	}
)