# Browser Functions Server

A powerful HTTP server that provides webpage screenshot and PDF conversion services using Puppeteer.

## Features

- 📸 **Screenshot Generation**: Capture screenshots of webpages or HTML content
- 📄 **PDF Conversion**: Convert webpages or HTML content to PDF files
- 🌐 **Dual Input Support**: Works with URLs or direct HTML content
- ⚡ **Fast Processing**: Optimized viewport settings for quick rendering
- 🔧 **Configurable**: Customizable server port and output settings

## Installation

```bash
pnpm install
```

## Running the Server

```bash
node index.js
```

By default, the server runs on port 8080. You can customize this by setting the `PORT` environment variable:

```bash
PORT=3000 node index.js
```

## API Endpoints

### Generate PDF

**Endpoint:** `POST /html-to-pdf`

**Request Body:**

Option 1 - From URL:

```json
{
  "url": "https://example.com/page-to-convert",
  "filename": "my-document"
}
```

Option 2 - From HTML content:

```json
{
  "url": null,
  "html": "<html><body><h1>Hello World</h1></body></html>",
  "filename": "my-document"
}
```

**Response:**

- Content-Type: `application/pdf`
- Content-Disposition: `inline; filename="my-document.pdf"`
- The generated PDF file as binary data

**Features:**

- Full page height capture
- Print background enabled
- No margins for full content display
- Optimized 1440px width for print quality

### Take Screenshot

**Endpoint:** `POST /screenshot`

**Request Body:**

Option 1 - From URL:

```json
{
  "url": "https://example.com/page-to-screenshot",
  "filename": "my-screenshot"
}
```

Option 2 - From HTML content:

```json
{
  "url": null,
  "html": "<html><body><h1>Hello World</h1></body></html>",
  "filename": "my-screenshot"
}
```

**Response:**

- Content-Type: `image/png`
- Content-Disposition: `inline; filename="my-screenshot.png"`
- The generated screenshot as PNG binary data

**Features:**

- 1280x720 viewport (classic desktop size)
- PNG format output
- Viewport-only capture (first screen)
- Network idle wait for complete loading

## Request Parameters

| Parameter  | Type   | Required    | Description                                              |
| ---------- | ------ | ----------- | -------------------------------------------------------- |
| `url`      | string | conditional | URL of the webpage (required if `html` not provided)     |
| `html`     | string | conditional | HTML content to process (required if `url` not provided) |
| `filename` | string | required    | Output filename without extension                        |

## Environment Variables

- `PORT`: The port on which the server runs (default: 8080)

## Example Usage

### Using curl

Generate PDF from URL:

```bash
curl -X POST http://localhost:8080/html-to-pdf \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","filename":"example-pdf"}' \
  --output example-pdf.pdf
```

Take screenshot from HTML:

```bash
curl -X POST http://localhost:8080/screenshot \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Hello World</h1>","filename":"hello-screenshot"}' \
  --output hello-screenshot.png
```

### Using JavaScript fetch

Generate PDF:

```javascript
fetch("http://localhost:8080/html-to-pdf", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://example.com",
    filename: "example-pdf",
  }),
})
  .then((response) => response.blob())
  .then((blob) => {
    // Create a link to download the PDF
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "example-pdf.pdf";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  })
  .catch((error) => console.error("Error generating PDF:", error));
```

Take screenshot:

```javascript
fetch("http://localhost:8080/screenshot", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    html: "<html><body><h1>My Custom Content</h1></body></html>",
    filename: "custom-screenshot",
  }),
})
  .then((response) => response.blob())
  .then((blob) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom-screenshot.png";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  })
  .catch((error) => console.error("Error taking screenshot:", error));
```

### Using Python requests

```python
import requests

# Generate PDF
pdf_response = requests.post(
    "http://localhost:8080/html-to-pdf",
    json={
        "url": "https://example.com",
        "filename": "example-pdf"
    }
)

with open("example-pdf.pdf", "wb") as f:
    f.write(pdf_response.content)

# Take screenshot
screenshot_response = requests.post(
    "http://localhost:8080/screenshot",
    json={
        "html": "<h1>Hello from Python</h1>",
        "filename": "python-screenshot"
    }
)

with open("python-screenshot.png", "wb") as f:
    f.write(screenshot_response.content)
```

## Error Handling

The server returns appropriate HTTP status codes:

- `200 OK`: Successful generation
- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: Processing errors

Error response format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Technical Details

### PDF Generation

- **Viewport**: 1440px width, dynamic height based on content
- **Format**: Full page capture with print backgrounds
- **Margins**: Zero margins for full content display
- **Timeout**: 10 seconds for HTML content, 60 seconds for URLs

### Screenshot Generation

- **Viewport**: 1280x720 pixels (desktop resolution)
- **Format**: PNG image
- **Capture**: Viewport-only (first screen)
- **Timeout**: 10 seconds for HTML content, 60 seconds for URLs

### Performance

- Each request launches a new browser instance for isolation
- Browser instances are automatically closed after processing
- Content size limit: 1MB for HTML input
- Network idle detection ensures complete page loading

## Limitations

- HTML content is limited to 1MB in size
- PDF generation captures the full page height
- Screenshots only capture the viewport area (1280x720)
- Each request creates a new browser instance (resource intensive for high traffic)
