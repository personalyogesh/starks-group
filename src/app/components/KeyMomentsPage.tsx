"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, Instagram, Sparkles, X } from "lucide-react";

import type { KeyMomentYearGroup } from "@/lib/localKeyMoments";
import Container from "@/components/ui/Container";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type KeyMomentsPageProps = {
  yearGroups: KeyMomentYearGroup[];
};

export default function KeyMomentsPage({ yearGroups }: KeyMomentsPageProps) {
  const [selectedYear, setSelectedYear] = useState(yearGroups[0]?.year ?? "");
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const filteredImages = useMemo(
    () => yearGroups.find((group) => group.year === selectedYear)?.images ?? [],
    [selectedYear, yearGroups],
  );

  const activeImage = selectedImage !== null ? filteredImages[selectedImage] ?? null : null;

  function goPrev() {
    setSelectedImage((prev) => {
      if (prev === null || filteredImages.length === 0) return null;
      return prev === 0 ? filteredImages.length - 1 : prev - 1;
    });
  }

  function goNext() {
    setSelectedImage((prev) => {
      if (prev === null || filteredImages.length === 0) return null;
      return prev === filteredImages.length - 1 ? 0 : prev + 1;
    });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf7_0%,#f8fbff_45%,#f7f7f8_100%)]">
      <header className="border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 py-6">
        <Container>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 rounded-3xl bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
              <h1 className="text-3xl font-black text-slate-950">Key Moments</h1>
              <p className="text-sm text-slate-600">
                A curated year-by-year archive of Starks Cricket&apos;s most important photos.
              </p>
            </div>

            <div className="rounded-3xl border border-white/50 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">More matchday photos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href="https://www.instagram.com/starkscricketclub?igsh=MmU3emNlMmpjNHR0&utm_source=qr"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" className="border-white/60 bg-white text-slate-900 shadow-sm hover:bg-slate-50">
                    <Instagram className="size-4" />
                    Follow on Instagram
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Container>
      </header>

      <Container>
        <div className="space-y-6 py-8">
          {yearGroups.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-3">
                {yearGroups.map((group) => (
                  <button
                    key={group.year}
                    type="button"
                    onClick={() => {
                      setSelectedYear(group.year);
                      setSelectedImage(null);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      selectedYear === group.year
                        ? "bg-slate-950 text-white shadow-md"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {group.year}
                  </button>
                ))}
              </div>

              <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
                <CardBody>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">{selectedYear} season</p>
                      <p className="mt-2 text-lg font-bold text-slate-950">
                        {filteredImages.length} key moment{filteredImages.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="max-w-xl space-y-1">
                      <p className="text-sm text-slate-600">
                        Highlight wins, team milestones, community events, and the memories that define each season.
                      </p>
                      <p className="text-sm font-medium text-blue-700">
                        Want the full gallery story? Follow Starks Cricket on Instagram.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredImages.map((image, index) => (
                  <Card
                    key={image.id}
                    className="group overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <button
                      type="button"
                      className="relative block w-full text-left"
                      onClick={() => setSelectedImage(index)}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={image.src}
                          alt={image.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-transparent p-3 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <p className="line-clamp-2 text-sm font-semibold">{image.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-white/80">{image.caption}</p>
                      </div>
                      <div className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/92 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                        {image.year}
                      </div>
                    </button>
                    <CardBody>
                      <h3 className="truncate font-semibold text-slate-950">{image.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{image.caption}</p>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Sparkles className="size-7" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-950">No key moments added yet</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
                Add folders like <code className="rounded bg-slate-100 px-1.5 py-0.5">public/key-moments/2025/</code> and
                place images inside. The page will group and display them automatically.
              </p>
            </div>
          )}
        </div>
      </Container>

      {activeImage ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
          role="presentation"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
            aria-label="Close gallery lightbox"
          >
            <X className="size-5" />
          </button>

          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            aria-label="Previous image"
          >
            <ChevronLeft className="size-5" />
          </button>

          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            aria-label="Next image"
          >
            <ChevronRight className="size-5" />
          </button>

          <div
            className="mx-auto flex h-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <div className="w-full space-y-4">
              <div className="flex justify-center">
                <div className="relative h-[70vh] w-full max-w-5xl">
                  <Image
                    src={activeImage.src}
                    alt={activeImage.title}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 text-white backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{activeImage.title}</p>
                    <p className="text-sm text-white/80">{activeImage.caption}</p>
                    <p className="mt-1 text-xs text-white/60">{activeImage.year} · Starks Cricket key moment</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-semibold text-white/80">
                    <span>{(selectedImage ?? 0) + 1} / {filteredImages.length}</span>
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="size-4" />
                      Curated archive
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
