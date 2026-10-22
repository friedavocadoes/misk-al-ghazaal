"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product } from "@/lib/types";
import { defaultVariant, variantImages } from "@/lib/product-options";
import { ProductGallery } from "./ProductGallery";

const Selection=createContext<{id?:string;select:(id:string)=>void}|null>(null);
export function ProductSelection({product,children}:{product:Product;children:ReactNode}) {
  const [id,select]=useState(defaultVariant(product)?.id);
  return <Selection.Provider value={{id,select}}>{children}</Selection.Provider>;
}
export function useProductVariant(product:Product) {
  const context=useContext(Selection);
  const [id,setId]=useState(defaultVariant(product)?.id);
  const selected=context?.id??id;
  return {variant:product.variants.find(v=>v.id===selected)??defaultVariant(product),select:context?.select??setId};
}
export function VariantGallery({product}:{product:Product}) {
  const {variant}=useProductVariant(product);
  return <ProductGallery key={variant?.id??product.id} images={variantImages(product,variant)} title={variant?.nameOverride??product.title}/>;
}
