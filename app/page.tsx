"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";

export default function HomePage() {
  useEffect(() => {
    redirect("/query");
  }, []);

  // This will only show briefly before the redirect
  return null;
}
