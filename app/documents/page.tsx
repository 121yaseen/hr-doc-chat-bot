"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  FaFile,
  FaTrash,
  FaSpinner,
  FaExclamationTriangle,
  FaRedo,
} from "react-icons/fa";
import Link from "next/link";

type Document = {
  id: string;
  filename: string;
  uploadDate: string;
  status: "processing" | "indexed" | "failed";
  size: number;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [reprocessLoading, setReprocessLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/documents");
      setDocuments(response.data.documents);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleteLoading(id);

    try {
      await axios.delete(`/api/documents/${id}`);
      setDocuments(documents.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Failed to delete document. Please try again.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleReprocess = async (id: string) => {
    setReprocessLoading(id);

    try {
      const response = await axios.post(`/api/documents/${id}/reprocess`);

      // Update the document status in the local state
      setDocuments(
        documents.map((doc) =>
          doc.id === id ? { ...doc, status: "processing" } : doc
        )
      );

      alert("Document reprocessing has started.");
    } catch (err) {
      console.error("Error reprocessing document:", err);
      alert("Failed to reprocess document. Please try again.");
    } finally {
      setReprocessLoading(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getStatusBadge = (status: Document["status"]) => {
    switch (status) {
      case "processing":
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
            Processing
          </span>
        );
      case "indexed":
        return (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            Indexed
          </span>
        );
      case "failed":
        return (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary-600 hover:text-primary-800">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold mt-4">Manage Documents</h1>
          <p className="text-gray-600">
            View and manage your uploaded HR documents.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-4xl text-primary-500" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
            <div className="flex items-center">
              <FaExclamationTriangle className="mr-2" />
              <p>{error}</p>
            </div>
            <button
              onClick={fetchDocuments}
              className="mt-2 text-red-700 hover:text-red-900 underline"
            >
              Try Again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <FaFile className="mx-auto text-4xl text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Documents Found</h2>
            <p className="text-gray-600 mb-6">
              You haven't uploaded any documents yet.
            </p>
            <Link href="/upload" className="btn btn-primary">
              Upload Documents
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Document
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Upload Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Size
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaFile className="text-gray-500 mr-3" />
                        <span className="font-medium text-gray-900 truncate max-w-xs">
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doc.uploadDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(doc.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {doc.status === "failed" && (
                          <button
                            onClick={() => handleReprocess(doc.id)}
                            disabled={reprocessLoading === doc.id}
                            className="text-blue-600 hover:text-blue-900"
                            title="Reprocess document"
                          >
                            {reprocessLoading === doc.id ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <FaRedo />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleteLoading === doc.id}
                          className="text-red-600 hover:text-red-900"
                          title="Delete document"
                        >
                          {deleteLoading === doc.id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaTrash />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
