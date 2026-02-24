"use client";

import { useRouter } from "next/navigation";

import { PartnersPage } from "@/app/components/public/PartnersPage";

export default function PublicPartnersRoute() {
  const router = useRouter();

  return (
    <PartnersPage
      navigateTo={(page) => {
        if (page === "contact") {
          router.push("/#about");
          return;
        }
        router.push(`/${page}`);
      }}
    />
  );
}

