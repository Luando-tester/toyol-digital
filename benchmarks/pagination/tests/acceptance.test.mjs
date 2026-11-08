import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePage} from '../src/page.mjs';
test('preserves pages in valid range',()=>{
  assert.equal(parsePage(2),2);assert.equal(parsePage('42'),42);assert.equal(parsePage(100),100);
});
test('clamps pages above max and below min',()=>{
  assert.equal(parsePage(120),100);assert.equal(parsePage(0),1);assert.equal(parsePage(-9),1);
});
test('rounds positive fractional pages down',()=>{
  assert.equal(parsePage('2.8'),2);
});
test('invalid strings and nonfinite inputs become page 1',()=>{
  assert.equal(parsePage('nonsense'),1);assert.equal(parsePage(Infinity),1);
});
