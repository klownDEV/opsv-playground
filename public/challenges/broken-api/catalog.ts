export type Product = { id: string; name: string; priceOre: number; stock: number };
export type BasketLine = { productId: string; quantity: number };

export function findProduct(products: Product[], id: string): Product | undefined {
  return products.find((product) => product.id.toLowerCase() === id.toLowerCase());
}

export function searchProducts(products: Product[], query: string) {
  return products
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((product) => product.name.includes(query));
}

export function reserveStock(product: Product, quantity: number): Product {
  product.stock -= quantity;
  return product;
}

export function basketTotal(products: Product[], lines: BasketLine[]) {
  return lines.reduce((sum, line) => {
    const product = findProduct(products, line.productId)!;
    return sum + Math.round((product.priceOre / 100) * line.quantity) * 100;
  }, 0);
}
