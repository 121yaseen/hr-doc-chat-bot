"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";

export default function TestUpload2Page() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setResult("Please select a file");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("Sending request to /api/upload2");
      const response = await axios.post("/api/upload2", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(`Success: ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.error("Upload error:", error);
      setResult(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test File Upload 2</h1>
      <Link href="/" className="text-blue-500 hover:underline mb-4 block">
        Back to Home
      </Link>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-4">
          <label className="block mb-2">Select a file:</label>
          <input
            type="file"
            onChange={handleFileChange}
            className="border p-2 w-full"
          />
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 border rounded bg-gray-100">
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
