"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { FaFileUpload, FaSpinner, FaCheck, FaTimes } from "react-icons/fa";
import Link from "next/link";
import { useUser } from "@/context/UserContext";

export default function UploadPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter for PDF and DOCX files
    const validFiles = acceptedFiles.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx") ||
        file.name.endsWith(".pdf")
    );
    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setUploadStatus({
        success: false,
        message: "Please select at least one file to upload.",
      });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axios.post("/api/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200) {
        setUploadStatus({
          success: true,
          message: `Successfully uploaded ${files.length} document(s).`,
        });
        setFiles([]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus({
        success: false,
        message: "An error occurred during upload. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Use useEffect for the redirect logic
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Return null during loading or if not authenticated
  if (loading || (!loading && !user)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary-600 hover:text-primary-800">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold mt-4">Upload Documents</h1>
          <p className="text-gray-600">
            Upload HR documents to be processed and indexed for future queries.
            PDF and DOCX files are accepted.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary-500 bg-primary-50"
              : "border-gray-300 hover:border-primary-400"
          }`}
        >
          <input {...getInputProps()} />
          <FaFileUpload className="mx-auto text-4xl text-primary-500 mb-4" />
          <p className="text-lg mb-2">
            {isDragActive
              ? "Drop the files here..."
              : "Drag & drop files here, or click to select files"}
          </p>
          <p className="text-sm text-gray-500">
            PDF and DOCX files are accepted
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Selected Files</h2>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm"
                >
                  <span className="truncate max-w-md">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remove file"
                  >
                    <FaTimes />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <button
                onClick={uploadFiles}
                disabled={uploading}
                className={`btn btn-primary ${
                  uploading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {uploading ? (
                  <>
                    <FaSpinner className="inline mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>Upload Files</>
                )}
              </button>
            </div>
          </div>
        )}

        {uploadStatus && (
          <div
            className={`mt-6 p-4 rounded-md ${
              uploadStatus.success
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <div className="flex items-center">
              {uploadStatus.success ? (
                <FaCheck className="mr-2" />
              ) : (
                <FaTimes className="mr-2" />
              )}
              <p className="font-medium">{uploadStatus.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
