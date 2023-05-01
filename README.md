|Rule name|Description|Auto-fixable|
|---|---|---|
|`bluebird-map-concurrency`|enforce passing a concurrency number to [`Bluebird.map`](http://bluebirdjs.com/docs/api/promise.map.html), for example `Bluebird.map([promise], { concurrency: 5 })`||
|`comment`|enforce starting a single-line comment with either `TODO:`, `HACK:`, `See {url}`, or a first-capitalized word||
|`export-name-after-file-name`|enforce naming a default exported identifier after the file name||
|`import-convention`|enforce naming imported identifiers after the user-defined list||
|`import-name-after-file-name`|enforce naming a default imported identifier after the file or the directory name (for an index file)||
|`import-name-after-predefined-name`|enforce naming an imported identifier after the user-defined list, for example given `["error", { "classnames": "cx" }]` then `import cx from "classnames"`||
|`import-path-from-closest-index`|enforce writing an import path pointing to the closest index file||
|`import-path-without-mentioning-index`|enforce writing an import path to an index file without mentioning "index.js"|Yes|
|`new-line-before-chain`|enforce having a new line per chaining method||
|`new-line-between-blocks`|enforce having new lines between blocks and before `else` and `catch`||
|`no-shortened-identifier`|enforce naming an identifier without the user-defined abbreviations||
|`no-top-level-require`|enforce writing no top-level `require`||
|`prefer-explicit-length-check`|enforce comparing `length` using an explicit comparison operator|Yes|
|`promise-all-with-static-array`|enforce passing a static array to `Promise.all()`||
|`react-export-default`|enforce writing React components consistently|Yes|
|`react-prop-type`|enforce writing type definition for React props||
|`react-sort-props`|enforce consistent React props sorting|Yes|
|`require-name-after-file-name`|enforce naming an identifier after the file name of its `require` statement||
|`require-name-after-predefined-name`|enforce naming an identifier after the user-defined list of its `require` statement|Yes|
|`sort-imports`|enforce sorting `import` statements. By default, this will sort according to [Renke](https://github.com/renke/import-sort/tree/master/packages/import-sort-style-module)|Yes|
|`test-case-group`|enforce using a function reference as a test case description|Yes|
|`test-case-new-line`|enforce having a new line between `it`, `test`, `describe` and before `expect` function calls; this applies to _*.{test,spec}_ files only|Yes|
|`test-case-title`|enforce writing consistent test case titles for `it` and `test` function calls; the allowed pattern of the test case title is `"(does not) return/render/call/fetch/set/throw(s) ... (, given ...)"`; this also disallows writing some vague words, such proper, correct, appropriate, accurate, perfect||
|`typescript-enum-name`|enforce naming enumerations consistently; the possible options are `"PascalCase"` (default), `"camelCase"`, `"UPPERCASE"`, `"SNAKE_CASE"`||
|`typescript-explicit-return-type`|enforce writing an explicit return type for exported functions||
|`typescript-exported-interface`|enforce exporting an `interface`, unless it is inside a `declare` block||
|`typescript-interface-name`|enforce naming user-defined interfaces starting with "I"||
|`typescript-method-type`|enforce writing function types using arrow notation|Yes|
|`typescript-pascal-type`|enforce writing a type name with Pascal case||