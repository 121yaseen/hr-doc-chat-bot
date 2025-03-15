"use client";

import { useState, useRef } from "react";
import { FaUpload, FaSpinner, FaTimes } from "react-icons/fa";
import { useUser } from "@/context/UserContext";
import axios from "axios";

type UploadDocumentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function UploadDocumentModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadDocumentModalProps) {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0] || null;
    if (droppedFile) {
      // Check if file is PDF or DOCX
      const fileType = droppedFile.type;
      const fileName = droppedFile.name.toLowerCase();

      if (
        fileType === "application/pdf" ||
        fileName.endsWith(".pdf") ||
        fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileName.endsWith(".docx")
      ) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Please upload a PDF or DOCX file");
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.id);

      const response = await axios.post("/api/file-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200) {
        setSuccess(true);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Close the modal after a short delay
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(
        err.response?.data?.error ||
          "Failed to upload document. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Upload Document</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={uploading}
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">
                Document uploaded successfully!
              </div>
              <p className="text-gray-600">
                Your document is being processed and will be available for
                querying soon.
              </p>
            </div>
          ) : (
            <>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 cursor-pointer hover:bg-gray-50"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={uploading}
                />
                <FaUpload className="mx-auto text-gray-400 text-3xl mb-2" />
                <p className="text-gray-600 mb-1">
                  Drag and drop your document here, or click to browse
                </p>
                <p className="text-gray-500 text-sm">
                  Supported formats: PDF, DOCX
                </p>
              </div>

              {file && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4 flex items-center">
                  <div className="flex-1 truncate">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 rounded-md mr-2 hover:bg-gray-100"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    !file || uploading
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {uploading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaUpload className="mr-2" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
