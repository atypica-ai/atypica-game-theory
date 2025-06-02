const express = require("express");
const puppeteer = require("puppeteer");

// Create Express app
const app = express();
app.use(
  express.json({
    limit: "1mb", // html 内容在 1mb 以内
  }),
);

/**
 * Takes a screenshot of a webpage
 * @param {string} url - The URL of the webpage to screenshot
 * @param {string} html - The HTML content to screenshot
 * @param {string} filename - The filename for the output screenshot (without extension)
 * @returns {Promise<Buffer>} - Screenshot buffer content
 */
async function takeScreenshot({ url, html, filename }) {
  if (html) {
    console.log(`Taking screenshot of HTML content, size ${html.length} bytes`);
  } else {
    console.log(`Taking screenshot of URL: ${url}`);
  }

  // Launch browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set viewport to 1280x800 (classic desktop size)
  await page.setViewport({
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
  });

  try {
    // Navigate to the URL and wait for the page to load
    if (html) {
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 10000, // 10 second timeout
      });
    } else {
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 60000, // 60 second timeout
      });
    }

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false, // Only capture the viewport (first screen)
    });

    console.log(`Successfully created screenshot for: ${filename}.png`);
    return screenshotBuffer;
  } catch (error) {
    console.error("Error taking screenshot:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Converts a webpage to PDF
 * @param {string} url - The URL of the webpage to convert
 * @param {string} filename - The filename for the output PDF (without extension)
 * @returns {Promise<Buffer>} - PDF buffer content
 */
async function htmlToPDF({ url, html, filename }) {
  if (html) {
    console.log(`Converting HTML content to PDF, size ${html.length} bytes`);
  } else {
    console.log(`Converting URL: ${url} to PDF`);
  }

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
    if (html) {
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 10000, // 10 second timeout
      });
    } else {
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 60000, // 60 second timeout
      });
    }

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

// API endpoint for screenshot generation
app.post("/screenshot", async (req, res) => {
  try {
    const { url, html, filename } = req.body;

    // Validate required parameters
    if ((!url && !html) || !filename) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: url or html is required, filename is required",
      });
    }

    // Generate screenshot buffer
    const screenshotBuffer = await takeScreenshot({ url, html, filename });

    // Return the screenshot buffer as a response
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${filename}.png"`,
      "Content-Length": screenshotBuffer.length,
    });

    res.send(screenshotBuffer);
  } catch (error) {
    console.error("Error in /screenshot endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to take screenshot",
    });
  }
});

// API endpoint for PDF generation
app.post("/html-to-pdf", async (req, res) => {
  try {
    const { url, html, filename } = req.body;

    // Validate required parameters
    if ((!url && !html) || !filename) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: url or html is required, filename is required",
      });
    }

    // Generate PDF buffer directly
    const pdfBuffer = await htmlToPDF({ url, html, filename });

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
app.listen(PORT, (error) => {
  if (error) {
    console.error("Error starting server:", error);
  } else {
    console.log(`browser function server running on port ${PORT}`);
    console.log(`PDF generation endpoint: http://localhost:${PORT}/html-to-pdf`);
    console.log(`Screenshot endpoint: http://localhost:${PORT}/screenshot`);
  }
});
