import ExcelJS from "exceljs";
import { storefrontProductPath } from "@/features/originales/config";

export type ExportProduct = {
  id: string;
  title: string;
  slug: string;
  is_active?: boolean | null;
  lineups: { slug: string } | { slug: string }[] | null;
  product_notes: {
    kind: string;
    position: number;
    notes: { name: string } | { name: string }[] | null;
  }[];
};
export async function productWorkbook(
  products: ExportProduct[],
  origin: string,
) {
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol))
    throw new Error("Invalid website origin");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Misk Al Ghazaal";
  for (const active of [true, false]) {
    const sheet = workbook.addWorksheet(
      active ? "Enabled products" : "Disabled products",
      { views: [{ state: "frozen", ySplit: 1 }] },
    );
    sheet.columns = [
      { header: "Product name", key: "name", width: 42 },
      { header: "Product page", key: "url", width: 75 },
      { header: "Top notes", key: "top", width: 35 },
      { header: "Heart notes", key: "heart", width: 35 },
      { header: "Base notes", key: "base", width: 35 },
    ];
    for (const product of products.filter(
      (p) => (p.is_active !== false) === active,
    )) {
      const lineup = Array.isArray(product.lineups)
        ? product.lineups[0]
        : product.lineups;
      const url = new URL(
        storefrontProductPath({ slug: product.slug, lineupSlug: lineup?.slug }),
        base.origin,
      ).href;
      const notes = (kind: string) =>
        (product.product_notes ?? [])
          .filter((n) => n.kind === kind)
          .sort((a, b) => a.position - b.position)
          .flatMap((n) => {
            const note = Array.isArray(n.notes) ? n.notes[0] : n.notes;
            return note ? [note.name] : [];
          })
          .join(", ");
      const row = sheet.addRow({
        name: product.title,
        url: { text: url, hyperlink: url },
        top: notes("top"),
        heart: notes("heart"),
        base: notes("base"),
      });
      row.alignment = { vertical: "top", wrapText: true };
      row.height = 42;
      row.getCell("url").font = {
        color: { argb: "FF225588" },
        underline: true,
      };
    }
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, sheet.rowCount), column: 5 },
    };
    sheet.getRow(1).height = 28;
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFF5E8D3" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF24211E" },
      };
    });
  }
  return workbook.xlsx.writeBuffer();
}
