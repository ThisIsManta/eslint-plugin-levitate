|Rule name|Description|Auto-fixable|
|---|---|---|
|`bluebird-map-concurrency`|enforce passing a concurrency number to [`Bluebird.map`](http://bluebirdjs.com/docs/api/promise.map.html), for example `Bluebird.map([promise], { concurrency: 5 })`||
|`comment`|enforce starting a single-line comment with either `TODO:`, `HACK:`, `See {url}`, or a first-capitalized word|Yes|
|`import-name-after-file-name`|enforce naming an imported identifier after file or directory name, for example `import MyComponent from "./MyComponent"`||
|`import-name-after-predefined-name`|enforce naming an imported identifier after the user-defined list, for example given `["error", { "classnames": "cx" }]` `import cx from "classnames"`||
|`import-path-from-closest-index`|enforce writing an import path pointing to the closest index file||
|`import-path-without-mentioning-index`|enforce writing an import path to an index file without mentioning "index.js"|Yes|
|`promise-all-with-static-array`|enforce passing a static array to `Promise.all()`||
|`require-name-after-file-name`|enforce naming an identifier after the file name of its `require` statement|Yes|
|`require-name-after-predefined-name`|enforce naming an identifier after the user-defined list of its `require` statement|Yes|
|`sort-imports`|enforce sorting `import` statements. By default, this will sort according to [Renke](https://github.com/renke/import-sort/tree/master/packages/import-sort-style-module)|Yes|
|`test-case-new-line`|enforce having a new line between `it`, `test`, and `describe` function calls; this applies to _*.{test,spec}_ files only|Yes|
|`test-case-title`|enforce writing consistent test case titles for `it` and `test` function calls; this applies to _*.{test,spec}_ files only; the pattern of the test case title is `"(does not) return/render/call/fetch/set/throw(s) ... (, given ...)"`||
|`typescript-enum-name`|enforce naming enumerations consistently; the possible options are `"PascalCase"` (default), `"camelCase"`, `"UPPERCASE"`, `"SNAKE_CASE"`||
|`typescript-explicit-return-type`|enforce writing an explicit return type for exported functions||
|`typescript-exported-interface`|enforce exporting interfaces||