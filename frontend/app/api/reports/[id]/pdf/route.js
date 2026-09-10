import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const rawId = resolvedParams?.id || "";
  const id = rawId.toUpperCase();

  const pdfPath = path.join(process.cwd(), "public", "reports", `${id}-forensic-report.pdf`);

  if (!fs.existsSync(pdfPath)) {
    return new NextResponse(`Forensic report PDF for case ${id} not found`, {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const fileBuffer = fs.readFileSync(pdfPath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${id}-forensic-report.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
