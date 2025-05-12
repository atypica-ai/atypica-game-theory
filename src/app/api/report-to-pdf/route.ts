import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";
import puppeteer from "puppeteer";

// Helper function to create directory if it doesn't exist
const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportToken = searchParams.get("reportToken");
  if (!reportToken) {
    return NextResponse.json({ error: "Missing reportToken parameter" }, { status: 400 });
  }

  const tempDir = process.env.TEMP_DIR;
  if (!tempDir) {
    throw new Error("TEMP_DIR environment variable is not set");
  }
  const outputDir = path.join(tempDir, "report2pdf");
  ensureDir(outputDir);

  const pdfPath = path.join(outputDir, `${reportToken}.pdf`);

  if (fs.existsSync(pdfPath)) {
    rootLogger.info(`PDF for report ${reportToken} already exists, returning existing file`);
    const pdfBuffer = fs.readFileSync(pdfPath);
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${reportToken}.pdf"`,
      },
    });
  }

  rootLogger.info(`Generating new PDF for report ${reportToken}`);
  const report = await prisma.analystReport.findUniqueOrThrow({
    where: { token: reportToken },
  });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const printWidth = 1440;

  await page.setViewport({
    width: printWidth,
    height: 800,
    deviceScaleFactor: 1,
  });

  await page.setContent(report.onePageHtml);

  const bodyHeight = await page.evaluate(() => {
    return document.body.scrollHeight;
  });

  await page.setViewport({
    width: printWidth,
    height: bodyHeight,
    deviceScaleFactor: 1,
  });

  await page.pdf({
    path: pdfPath,
    width: printWidth + "px",
    height: bodyHeight + "px",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  await browser.close();

  // Check if the PDF file exists after generation
  if (!fs.existsSync(pdfPath)) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate PDF",
      },
      { status: 500 },
    );
  }

  // Read the PDF file
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Return the PDF file as a response
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${reportToken}.pdf"`,
    },
  });
}
