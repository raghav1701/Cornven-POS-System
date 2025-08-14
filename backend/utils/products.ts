// src/utils/products.ts
import prisma from "../prisma/prisma";

export async function recomputeProductAggregates(productId: string) {
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    select: { price: true, stock: true },
  });

  if (variants.length === 0) {
    // Prevent product from having no variants if price/stock are required.
    // You can throw instead if you want to forbid deleting the last variant.
    await prisma.product.update({
      where: { id: productId },
      data: { price: 0, stock: 0 },
    });
    return;
  }

  const minPrice = Math.min(...variants.map((v) => v.price));
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  await prisma.product.update({
    where: { id: productId },
    data: { price: minPrice, stock: totalStock },
  });
}
