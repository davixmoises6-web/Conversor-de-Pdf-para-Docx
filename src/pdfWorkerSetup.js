import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Aponta para o worker local dentro da pasta "public"
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";

export default pdfjsLib;
