// src/utils/barcode.ts
import crypto from "crypto";
import { BarcodeType } from "@prisma/client";

// Generate a unique Code128-safe string
export function generateBarcode(type: BarcodeType = "CODE128"): string {
  if (type === "CODE128") {
    return crypto
      .randomBytes(12)
      .toString("base64url")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 20);
  }
  // You could add EAN-13 with checksum here if needed
  return crypto.randomBytes(12).toString("hex").toUpperCase();
}

export function validateBarcode(value: string, type: BarcodeType = "CODE128") {
  if (type === "CODE128") {
    if (!/^[A-Z0-9\-_.]{6,32}$/.test(value)) return false;
    return true;
  }
  return value.length > 6;
}
