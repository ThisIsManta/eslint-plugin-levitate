import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './no-shortened-identifier.mjs'

export default test(
	{
		rules: { 'no-shortened-identifier': rule },
	},
	{
		valid: [
			{
				code: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum TABLE_IDX {}
				`,
			},
		],
		invalid: [
			{
				code: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
				options: [{ idx: 'index' }],
				errors: [
					{
						message: 'Unexpected the abbreviation "Idx" as in `findIdx`',
						line: 2,
						suggestions: [
							{
								desc: 'Did you mean "findIndex"?',
								output: `
        function findIndex() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "Idx" as in `findIdx2`',
						line: 3,
						suggestions: [
							{
								desc: 'Did you mean "findIndex2"?',
								output: `
        function findIdx() {}
				const findIndex2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "idx"',
						line: 3,
						suggestions: [
							{
								desc: 'Did you mean "index"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (index) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "Idx" as in `findIdx3`',
						line: 4,
						suggestions: [
							{
								desc: 'Did you mean "findIndex3"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIndex3 = (idx) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "idx"',
						line: 4,
						suggestions: [
							{
								desc: 'Did you mean "index"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (index) => {}
				type Idx = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "Idx"',
						line: 5,
						suggestions: [
							{
								desc: 'Did you mean "Index"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Index = {}
				enum _TABLE_IDX_ {}
				`,
							}
						]
					},
					{
						message: 'Unexpected the abbreviation "IDX" as in `_TABLE_IDX_`',
						line: 6,
						suggestions: [
							{
								desc: 'Did you mean "_TABLE_INDEX_"?',
								output: `
        function findIdx() {}
				const findIdx2 = function (idx) {}
				const findIdx3 = (idx) => {}
				type Idx = {}
				enum _TABLE_INDEX_ {}
				`,
							}
						]
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