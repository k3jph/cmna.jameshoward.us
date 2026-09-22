import test from "node:test";
import assert from "node:assert/strict";
import {
  presets,
  bisectionTrace,
  newtonTrace,
  secantTrace,
} from "../public/js/numerical-functions.js";

test("bisection converges on x^3 - x - 2", () => {
  const p = presets.cubic;
  const result = bisectionTrace(p.f, p.a, p.b, 1e-6, 100);
  assert.ok(Math.abs(result.root - 1.5213797068) < 1e-5);
  assert.ok(result.width <= 1e-6);
});

test("CMNA cubic bracket converges to 15", () => {
  const p = presets.book;
  const result = bisectionTrace(p.f, p.a, p.b, 1e-6, 100);
  assert.ok(Math.abs(result.root - 15) < 1e-5);
});

test("bisection rejects an interval without a sign change", () => {
  assert.throws(
    () => bisectionTrace((x) => x * x + 1, -1, 1, 1e-3, 100),
    /bracket a sign change/,
  );
});

test("Newton converges on sqrt(2)", () => {
  const p = presets.sqrt2;
  const result = newtonTrace(p.f, p.df, p.x0, 1e-8, 100);
  assert.equal(result.failed, null);
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-7);
});

test("secant converges on sqrt(2)", () => {
  const p = presets.sqrt2;
  const result = secantTrace(p.f, p.x0, 1e-8, 100);
  assert.equal(result.failed, null);
  assert.ok(Math.abs(result.root - Math.SQRT2) < 1e-7);
});
