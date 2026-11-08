import test from 'node:test';
import assert from 'node:assert/strict';
import {toSlug} from '../src/slug.mjs';
test('trim and lowercase',()=>{
 assert.equal(toSlug('  HELLO World  '),'hello-world');
});
test('multiple spaces and tabs become a single hyphen',()=>{
 assert.equal(toSlug('A   B\tC'),'a-b-c');
});
test('preserves punctuation and empty values',()=>{
 assert.equal(toSlug('Hello, World!'),'hello,-world!');
 assert.equal(toSlug('    '),'');
});
