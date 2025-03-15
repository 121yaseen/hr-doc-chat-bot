"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { FaSpinner, FaFileUpload, FaSearch, FaBook } from "react-icons/fa";
import Link from "next/link";

export default function HomePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setRedirecting(true);
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || redirecting) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl mx-auto text-primary-600 mb-4" />
          <p className="text-gray-600">
            {redirecting ? "Redirecting to login..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary-700 mb-4">
          HR Document Bot
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Upload PDF or DOCX documents, process them, and query the information
          with natural language.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <Link href="/upload" className="card hover:shadow-lg transition-shadow">
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md">
            <div className="bg-primary-100 p-4 rounded-full mb-4">
              <FaFileUpload className="text-4xl text-primary-600" />
            </div>
            <h2 className="text-2xl font-semibold text-primary-700 mb-2">
              Upload Documents
            </h2>
            <p className="text-gray-600">
              Upload PDF and DOCX documents to be processed and indexed for
              future queries.
            </p>
          </div>
        </Link>

        <Link href="/query" className="card hover:shadow-lg transition-shadow">
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md">
            <div className="bg-primary-100 p-4 rounded-full mb-4">
              <FaSearch className="text-4xl text-primary-600" />
            </div>
            <h2 className="text-2xl font-semibold text-primary-700 mb-2">
              Query Documents
            </h2>
            <p className="text-gray-600">
              Ask questions about your uploaded documents and get accurate
              answers.
            </p>
          </div>
        </Link>

        <Link
          href="/documents"
          className="card hover:shadow-lg transition-shadow"
        >
          <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md">
            <div className="bg-primary-100 p-4 rounded-full mb-4">
              <FaBook className="text-4xl text-primary-600" />
            </div>
            <h2 className="text-2xl font-semibold text-primary-700 mb-2">
              Manage Documents
            </h2>
            <p className="text-gray-600">
              View and manage your uploaded documents and their processing
              status.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
