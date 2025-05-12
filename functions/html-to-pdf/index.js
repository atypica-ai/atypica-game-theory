const express = require("express");
const puppeteer = require("puppeteer");

// Create Express app
const app = express();
app.use(express.json());

/**
 * Converts a webpage to PDF
 * @param {string} url - The URL of the webpage to convert
 * @param {string} filename - The filename for the output PDF (without extension)
 * @returns {Promise<Buffer>} - PDF buffer content
 */
async function htmlToPDF(url, filename) {
  console.log(`Converting URL: ${url} to PDF`);

  // Launch browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const printWidth = 1440;

  // Set initial viewport
  await page.setViewport({
    width: printWidth,
    height: 800,
    deviceScaleFactor: 1,
  });

  try {
    // Navigate to the URL and wait for the page to load
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60000, // 60 second timeout
    });

    // Get the actual page height
    const bodyHeight = await page.evaluate(() => {
      return document.body.scrollHeight;
    });

    // Reset viewport to match content height
    await page.setViewport({
      width: printWidth,
      height: bodyHeight,
      deviceScaleFactor: 1,
    });

    // Generate PDF and return buffer directly
    const pdfBuffer = await page.pdf({
      width: printWidth + "px",
      height: bodyHeight + "px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    console.log(`Successfully created PDF buffer for: ${filename}.pdf`);
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

// API endpoint for PDF generation
app.post("/html-to-pdf", async (req, res) => {
  try {
    const { url, filename } = req.body;

    // Validate required parameters
    if (!url || !filename) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: url and filename are required",
      });
    }

    // Generate PDF buffer directly
    const pdfBuffer = await htmlToPDF(url, filename);

    // Return the PDF buffer as a response
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error in /html-to-pdf endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate PDF",
    });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`html-to-pdf server running on port ${PORT}`);
  console.log(`PDF generation endpoint: http://localhost:${PORT}/html-to-pdf`);
});
