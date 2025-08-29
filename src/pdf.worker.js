import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.entry";

export default function createWorker() {
  return new PdfWorker.Worker();
}
