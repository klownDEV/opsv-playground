import assert from "node:assert/strict";
import test from "node:test";
import { basketTotal, findProduct, reserveStock, searchProducts, type Product } from "./catalog.ts";

const createProducts = (): Product[] => [
  { id: "SE-01", name: "Blå mugg", priceOre: 1295, stock: 3 },
  { id: "se-02", name: "Anteckningsbok", priceOre: 4990, stock: 8 },
];

test("findProduct använder exakt id", () => assert.equal(findProduct(createProducts(), "se-01"), undefined));
test("findProduct returnerar undefined för saknat id", () => assert.equal(findProduct(createProducts(), "SE-99"), undefined));
test("searchProducts trimmar och ignorerar skiftläge", () => assert.deepEqual(searchProducts(createProducts(), "  MUGG ").map((p) => p.id), ["SE-01"]));
test("searchProducts ändrar inte originalordningen", () => { const products = createProducts(); const before = structuredClone(products); searchProducts(products, "a"); assert.deepEqual(products, before); });
test("reserveStock vägrar mer än lagersaldot", () => assert.throws(() => reserveStock(createProducts()[0], 4)));
test("basketTotal räknar exakt i ören", () => assert.equal(basketTotal(createProducts(), [{ productId: "SE-01", quantity: 3 }]), 3885));
