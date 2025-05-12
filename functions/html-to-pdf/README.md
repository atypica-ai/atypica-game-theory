# HTML to PDF Server

A simple HTTP server that converts HTML webpages to PDF files using Puppeteer.

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

By default, the server runs on port 8080. You can customize this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## API Endpoints

### Generate PDF

**Endpoint:** `POST /html-to-pdf`

**Request Body:**

```json
{
  "url": "https://example.com/page-to-convert",
  "filename": "my-document"
}
```

**Response:**

- The generated PDF file with `Content-Type: application/pdf`

## Environment Variables

- `PORT`: The port on which the server runs (default: 8080)
- `OUTPUT_DIR`: Directory where PDFs are saved (default: './tmp')

## Example Usage

Using curl:

```bash
curl -X POST http://localhost:8080/html-to-pdf \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","filename":"example-pdf"}' \
  --output example-pdf.pdf
```

Using JavaScript fetch:

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
