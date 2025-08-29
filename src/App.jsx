import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileDown, Loader2 } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, PageBreak } from "docx";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Usa worker via CDN para evitar problemas de Vite
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js";

export default function App() {
  const [tab, setTab] = useState("leitor");
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [includePageBreaks, setIncludePageBreaks] = useState(true);
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const iframeRef = useRef(null);

  const fileNameNoExt = useMemo(() => {
    if (!file) return "documento";
    const name = file.name || "documento";
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.substring(0, dot) : name;
  }, [file]);

  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setFile(f);
    setPdfUrl(URL.createObjectURL(f));
    setStatus("");
    setStatusError(false);
  }

  async function extractTextWithPDFjs(pdfArrayBuffer) {
    const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
    const allPagesText = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      setStatus(`Lendo página ${pageNum}/${pdf.numPages}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : item?.text || ""))
        .join(" ")
        .replace(/[\u0000-\u001F]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      allPagesText.push(pageText);
    }

    return allPagesText;
  }

  function splitIntoParagraphs(text) {
    const byPunct = text.split(/([.!?])\s+/).reduce((acc, cur, idx, arr) => {
      if (idx % 2 === 0) acc.push(cur + (arr[idx + 1] || ""));
      return acc;
    }, []);

    const paras = [];
    let buf = "";
    for (const s of byPunct) {
      if ((buf + " " + s).length > 1000 && buf.length > 0) {
        paras.push(buf.trim());
        buf = s;
      } else buf = buf ? buf + " " + s : s;
    }
    if (buf) paras.push(buf.trim());
    return paras.filter(Boolean);
  }

  async function handleConvert() {
    if (!file) return;
    setBusy(true);
    setStatus("Abrindo PDF...");
    setStatusError(false);

    try {
      const buf = await file.arrayBuffer();
      const pages = await extractTextWithPDFjs(buf);

      setStatus("Gerando DOCX...");
      const doc = new Document({
        sections: pages.map((pageText, idx) => ({
          properties: {},
          children: [
            ...splitIntoParagraphs(pageText).map(
              (p) => new Paragraph({ children: [new TextRun({ text: p })] })
            ),
            ...(includePageBreaks && idx < pages.length - 1
              ? [new Paragraph({ children: [new PageBreak()] })]
              : []),
          ],
        })),
      });

      const blob = await Packer.toBlob(doc);
      const outName = `${fileNameNoExt}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("Pronto! Documento gerado.");
      setStatusError(false);
    } catch (err) {
      console.error(err);
      setStatus(err.message || "Falha na conversão do PDF.");
      setStatusError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ fontFamily: "Arial,sans-serif", width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", background: "#4B0082", color: "#fff" }}>
        <h1 style={{ margin: 0 }}>Leitor e Conversor de PDF</h1>
        <div>
          <button onClick={() => setTab("leitor")} style={{ border: "none", background: "none", borderBottom: tab === "leitor" ? "2px solid #9307caff" : "none", color: tab === "leitor" ? "#ffffffff" : "#7700ffff", marginRight: 10, padding: 5, cursor: "pointer" }}>Leitor</button>
          <button onClick={() => setTab("conversor")} style={{ border: "none", background: "none", borderBottom: tab === "conversor" ? "2px solid #7700ffff" : "none", color: tab === "conversor" ? "#700baaff" : "#fff", padding: 5, cursor: "pointer" }}>Conversor</button>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", gap: 20, padding: 20 }}>
        <div style={{ flex: 2, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 10 }}>
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
          </div>
          <div style={{ flex: 1, background: "#616161ff", display: "flex", justifyContent: "center", alignItems: "center", border: "1px solid #ccc", borderRadius: 8 }}>
            {pdfUrl ? <iframe ref={iframeRef} src={pdfUrl} style={{ width: "100%", height: "100%" }} title="PDF" /> : <span style={{ color: "#888" }}>Selecione um PDF para visualizar.</span>}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {tab === "conversor" && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 5, color: "#333" }}>
                <input type="checkbox" checked={includePageBreaks} onChange={(e) => setIncludePageBreaks(e.target.checked)} />
                Inserir quebra de página
              </label>
              <motion.button whileTap={{ scale: 0.98 }} disabled={!file || busy} onClick={handleConvert} style={{ padding: 10, marginTop: 10, cursor: "pointer", backgroundColor: "#535353ff", color: "#a7a7a7ff", border: "none", borderRadius: 5 }}>
                {busy ? <><Loader2 style={{ width: 16, height: 16, marginRight: 5 }} className="animate-spin" /> Convertendo...</> : <><FileDown style={{ width: 16, height: 16, marginRight: 5 }} /> Converter</>}
              </motion.button>
              {status && <p style={{ marginTop: 10, color: statusError ? "red" : "green" }}>{status}</p>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
