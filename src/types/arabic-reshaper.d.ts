declare module "arabic-reshaper" {
  const ArabicReshaper: {
    /** Shapes logical-order Arabic to presentation forms (still logical
        order — reverse Arabic runs for LTR canvases like pdfkit). */
    convertArabic(normal: string): string;
    convertArabicBack(apfb: string): string;
  };
  export default ArabicReshaper;
}
