import test from 'node:test';
import assert from 'node:assert/strict';
import {uniqueIds} from '../src/uniqueIds.mjs';
test('keeps first occurrence of each ID', () => {
  const items=[{id:1,n:'first'},{id:2,n:'second'},{id:1,n:'duplicate'},{id:3,n:'third'}];
  assert.deepEqual(uniqueIds(items),[items[0],items[1],items[3]]);
});
test('accepts empty and single-record arrays', () => {
  assert.deepEqual(uniqueIds([]),[]);
  assert.deepEqual(uniqueIds([{id:'a'}]),[{id:'a'}]);
});
test('preserves original array without mutation', () => {
  const input=[{id:'x'},{id:'x'}];uniqueIds(input);assert.equal(input.length,2);
});
