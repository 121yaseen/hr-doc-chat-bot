const { PythonShell } = require("python-shell");
const path = require("path");
const fs = require("fs");

// Check if a PDF file path was provided
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide a path to a PDF file");
  process.exit(1);
}

const pdfPath = args[0];

// Check if the file exists
if (!fs.existsSync(pdfPath)) {
  console.error(`File not found: ${pdfPath}`);
  process.exit(1);
}

console.log(`Testing PDF extraction on: ${pdfPath}`);

// Set up Python shell options
const options = {
  mode: "json",
  pythonPath: path.join(process.cwd(), "pdf_env/bin/python"),
  scriptPath: path.join(process.cwd(), "scripts"),
  args: [pdfPath],
};

// Run the Python script
PythonShell.run("extract_pdf_text.py", options)
  .then((results) => {
    if (results && results.length > 0) {
      const result = results[0];

      if (result.success) {
        console.log("PDF extraction successful!");
        console.log("Metadata:", result.metadata);
        console.log("Text length:", result.text.length);
        console.log("First 500 characters:");
        console.log(result.text.substring(0, 500));
      } else {
        console.error("Error in PDF extraction:", result.error);
        console.error("Traceback:", result.traceback);
      }
    } else {
      console.error("No results returned from PDF extraction");
    }
  })
  .catch((err) => {
    console.error("Error running Python script:", err);
  });
