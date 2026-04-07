"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import AnimatedList from "@/components/AnimatedList";
import CountUp from "@/components/CountUp";
import { gsap } from "gsap";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  MoonStar,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

interface NameEntry {
  id: string;
  firstName: string;
  lastName: string;
  selected: boolean;
}

export default function Home() {
  const spinDurationSeconds = 2.2;
  const [names, setNames] = useState<NameEntry[]>([]);
  const [selectedNames, setSelectedNames] = useState<NameEntry[]>([]);
  const [currentWinner, setCurrentWinner] = useState<NameEntry | null>(null);
  const [spinSequence, setSpinSequence] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPicking, setIsPicking] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showAllNames, setShowAllNames] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const winnerRef = useRef<HTMLDivElement>(null);
  const winnerGlowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const spinTimeoutRef = useRef<number | null>(null);

  const fullName = (entry: NameEntry) =>
    [entry.firstName, entry.lastName].filter(Boolean).join(" ");

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-content",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.2 },
      );

      if (backgroundRef.current) {
        gsap.fromTo(
          backgroundRef.current,
          { scale: 1.1, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.5, ease: "power2.out" },
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              entry.target,
              { opacity: 0, y: 40 },
              { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    [uploadRef, listRef].forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, [names.length]);

  useEffect(() => {
    if (currentWinner && winnerRef.current) {
      gsap.fromTo(
        winnerRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" },
      );

      if (winnerGlowRef.current) {
        gsap.fromTo(
          winnerGlowRef.current,
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out", delay: 0.2 },
        );
      }
    }
  }, [currentWinner]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const processFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);

    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.name.endsWith(".csv")
    ) {
      setUploadError("الرجاء رفع ملف Excel (.xlsx) أو CSV فقط");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
        }) as string[][];

        const extractedNames: NameEntry[] = [];
        const timestamp = Date.now();

        jsonData.forEach((row, index) => {
          const firstName = typeof row[0] === "string" ? row[0].trim() : "";
          const lastName = typeof row[1] === "string" ? row[1].trim() : "";

          if (firstName || lastName) {
            extractedNames.push({
              id: `name-${index}-${timestamp}`,
              firstName,
              lastName,
              selected: false,
            });
          }
        });

        if (extractedNames.length === 0) {
          setUploadError(
            "لم يتم العثور على أسماء في الملف. تأكد من وجود الاسم الأول أو اسم العائلة في العمودين الأول والثاني",
          );
          return;
        }

        setNames(extractedNames);
        setSelectedNames([]);
        setCurrentWinner(null);
        setSpinSequence([]);
        setSearchQuery("");
        setShowAllNames(false);
        setUploadSuccess(true);
      } catch {
        setUploadError("حدث خطأ في قراءة الملف. تأكد من صحة الملف");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = "";
  };

  const pickRandomName = () => {
    const availableNames = names.filter((entry) => !entry.selected);
    if (availableNames.length === 0) {
      return;
    }

    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
    }

    setIsPicking(true);
    setCurrentWinner(null);

    const finalWinner =
      availableNames[Math.floor(Math.random() * availableNames.length)];
    const sequenceLength = Math.max(18, Math.min(availableNames.length * 3, 32));
    const generatedSequence = Array.from({ length: sequenceLength - 1 }, () => {
      const randomIndex = Math.floor(Math.random() * availableNames.length);
      return fullName(availableNames[randomIndex]);
    });

    generatedSequence.push(fullName(finalWinner));
    setSpinSequence(generatedSequence);

    spinTimeoutRef.current = window.setTimeout(() => {
      setNames((previous) =>
        previous.map((entry) =>
          entry.id === finalWinner.id ? { ...entry, selected: true } : entry,
        ),
      );
      setSelectedNames((previous) => [finalWinner, ...previous]);
      setCurrentWinner(finalWinner);
      setIsPicking(false);
    }, spinDurationSeconds * 1000);
  };

  const exportToTxt = () => {
    if (selectedNames.length === 0) {
      return;
    }

    const content = selectedNames
      .map((entry, index) => `${index + 1}. ${fullName(entry)}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `المختارون-للعمرة-${new Date().toLocaleDateString("ar-SA")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
    }

    setNames([]);
    setSelectedNames([]);
    setCurrentWinner(null);
    setSpinSequence([]);
    setUploadSuccess(false);
    setUploadError(null);
    setSearchQuery("");
    setShowAllNames(false);
    setShowConfirmReset(false);
    setIsPicking(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredNames = names.filter((entry) =>
    fullName(entry).toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const availableCount = names.filter((entry) => !entry.selected).length;
  const animatedNameItems = filteredNames.map((entry, index) => ({
    label: fullName(entry),
    value: entry.id,
    className: entry.selected
      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : "border border-slate-700/50 bg-slate-800/30 text-slate-300 hover:bg-slate-800/50",
    content: (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 text-sm text-slate-500">{index + 1}</span>
          <span className="font-medium">{fullName(entry)}</span>
          {entry.selected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        </div>
        {entry.selected && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400/80">
            تم الاختيار
          </span>
        )}
      </div>
    ),
  }));

  return (
    <main
      className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30"
      dir="rtl"
    >
      <div className="fixed inset-0 z-0">
        <div
          ref={backgroundRef}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://kimi-web-img.moonshot.cn/img/t3.ftcdn.net/510a81426d93258c21f121be8f76eec5cf103366.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/90" />
        <div className="absolute inset-0 bg-emerald-950/10 mix-blend-overlay" />
      </div>

      <div className="relative z-10">
        <section
          ref={heroRef}
          className="flex min-h-[60vh] items-center justify-center px-4 py-20"
        >
          <div className="hero-content mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-2xl text-emerald-400 backdrop-blur-sm">
              <MoonStar className="h-4 w-4" />
              <span>بسم الله الرحمن الرحيم</span>
            </div>

            <h1 className="mb-6 bg-gradient-to-r from-emerald-200 via-white to-emerald-200 bg-clip-text text-5xl leading-tight font-bold text-transparent md:text-7xl">
              اختيار عشوائي للعمرة
            </h1>
          </div>
        </section>

        <section ref={uploadRef} className="mx-auto max-w-4xl px-4 py-12">
          <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl md:p-12">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Upload className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-white">رفع قائمة الأسماء</h2>
              <p className="text-slate-400">اسحب الملف هنا أو انقر للاختيار</p>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
                isDragging
                  ? "scale-[1.02] border-emerald-400 bg-emerald-500/10"
                  : "border-slate-600 hover:border-emerald-500/50 hover:bg-white/5"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />

              <FileSpreadsheet
                className={`mx-auto mb-4 h-12 w-12 transition-colors ${
                  isDragging ? "text-emerald-400" : "text-slate-400"
                }`}
              />

              <p className="mb-2 text-lg font-medium text-slate-200">
                {isDragging ? "أفلت الملف هنا" : "اختر ملف Excel أو CSV"}
              </p>
              <p className="text-sm text-slate-500">
                الأعمدة: الاسم الأول في العمود الأول واسم العائلة في العمود الثاني
              </p>
            </div>

            {uploadError && (
              <div className="animate-fade-in mt-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{uploadError}</span>
                <button
                  onClick={() => setUploadError(null)}
                  className="mr-auto hover:text-red-300"
                  aria-label="إغلاق رسالة الخطأ"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {uploadSuccess && (
              <div className="animate-fade-in mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>تم رفع الملف بنجاح! ({names.length} اسم)</span>
              </div>
            )}
          </div>
        </section>

        {names.length > 0 && (
          <section ref={listRef} className="mx-auto max-w-4xl px-4 py-12">
            <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">قائمة الأسماء</h3>
                    <p className="text-sm text-slate-400">
                      المتبقي: {availableCount} | المختارون: {selectedNames.length}
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="البحث في الأسماء..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2 pr-10 pl-4 text-slate-200 placeholder:text-slate-500 transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none md:w-64"
                  />
                </div>
              </div>

              {filteredNames.length === 0 ? (
                <p className="py-8 text-center text-slate-500">لا توجد نتائج مطابقة</p>
              ) : (
                <AnimatedList
                  items={animatedNameItems.slice(0, showAllNames ? undefined : 10)}
                  showGradients={false}
                  enableArrowNavigation={false}
                  displayScrollbar={false}
                  className="custom-scrollbar"
                />
              )}

              {filteredNames.length > 10 && (
                <button
                  onClick={() => setShowAllNames((previous) => !previous)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-slate-400 transition-colors hover:bg-white/5 hover:text-emerald-400"
                >
                  {showAllNames ? (
                    <>
                      عرض أقل <ChevronDown className="h-4 w-4 rotate-180" />
                    </>
                  ) : (
                    <>
                      عرض الكل ({filteredNames.length}) <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </section>
        )}

        {names.length > 0 && availableCount > 0 && (
          <section className="px-4 py-12 text-center">
            <button
              onClick={pickRandomName}
              disabled={isPicking}
              className={`group relative inline-flex items-center gap-3 rounded-2xl px-12 py-6 text-xl font-bold text-white shadow-xl shadow-emerald-950/30 transition-all duration-300 ${
                isPicking
                  ? "cursor-not-allowed bg-slate-700"
                  : "bg-linear-to-bl from-emerald-600 to-lime-400 hover:scale-105 hover:from-emerald-500 hover:to-lime-300 hover:shadow-2xl hover:shadow-emerald-500/25"
              }`}
            >
              <MoonStar
                className={`h-6 w-6 ${
                  isPicking ? "animate-spin" : "group-hover:animate-pulse"
                }`}
              />
              {isPicking ? "جاري الاختيار..." : "اختيار اسم عشوائي"}
            </button>
            <p className="mt-4 text-sm text-slate-400">
              يتم اختيار اسم واحد فقط في كل مرة دون تكرار
            </p>
          </section>
        )}

        {(isPicking || currentWinner) && (
          <section className="mx-auto max-w-2xl px-4 py-12">
            <div
              ref={winnerRef}
              className="relative rounded-3xl bg-gradient-to-br from-emerald-400/50 via-amber-200/30 to-emerald-400/50 p-1"
            >
              <div
                ref={winnerGlowRef}
                className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-400/20 via-amber-300/20 to-emerald-400/20 blur-2xl"
              />

              <div className="relative rounded-[22px] border border-white/10 bg-slate-900/90 p-8 text-center backdrop-blur-2xl md:p-12">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-slate-900 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/50">
                    <MoonStar className="h-10 w-10 text-white" />
                  </div>
                </div>

                <div className="mt-8 mb-4">
                  <span className="text-sm font-medium uppercase tracking-wider text-emerald-400">
                    {isPicking ? "جاري السحب" : "تم اختيار"}
                  </span>
                </div>

                {isPicking ? (
                  <CountUp
                    key={spinSequence.join("|")}
                    from={0}
                    to={Math.max(spinSequence.length - 1, 0)}
                    separator=","
                    direction="up"
                    duration={spinDurationSeconds}
                    className="count-up-text winner-spinning mb-6 text-4xl leading-relaxed font-bold text-white md:text-5xl"
                    startCounting
                    items={spinSequence}
                  />
                ) : currentWinner ? (
                  <h2 className="mb-6 text-4xl leading-relaxed font-bold text-white md:text-5xl">
                    {fullName(currentWinner)}
                  </h2>
                ) : null}

                <div className="flex items-center justify-center gap-2 text-amber-300/80">
                  <span className="text-2xl">✦</span>
                  <span className="text-lg">بالتوفيق في رحلة العمرة</span>
                  <span className="text-2xl">✦</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {selectedNames.length > 0 && (
          <section className="mx-auto max-w-4xl px-4 py-12">
            <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  الأسماء المختارة ({selectedNames.length})
                </h3>
              </div>

              <div className="space-y-2">
                {selectedNames.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="animate-fade-in flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent p-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
                      {index + 1}
                    </span>
                    <span className="font-medium text-emerald-100">{fullName(entry)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {names.length > 0 && (
          <section className="mx-auto max-w-4xl px-4 py-12">
            <div className="flex flex-col justify-center gap-4 md:flex-row">
              {selectedNames.length > 0 && (
                <button
                  onClick={exportToTxt}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-8 py-4 font-medium text-white transition-all duration-300 hover:scale-105 hover:border-emerald-500/30 hover:bg-slate-700"
                >
                  <Download className="h-5 w-5 text-emerald-400" />
                  تصدير TXT
                </button>
              )}

              <button
                onClick={() => setShowConfirmReset(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-8 py-4 font-medium text-red-400 transition-all duration-300 hover:scale-105 hover:bg-red-500/20"
              >
                <RotateCcw className="h-5 w-5" />
                إعادة تعيين
              </button>
            </div>
          </section>
        )}
      </div>

      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="glass-card animate-fade-in w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <Trash2 className="h-8 w-8" />
            </div>

            <h3 className="mb-2 text-center text-2xl font-bold text-white">
              تأكيد إعادة التعيين
            </h3>
            <p className="mb-8 text-center text-slate-400">
              هل أنت متأكد من حذف جميع الأسماء والبدء من جديد؟ لا يمكن التراجع عن هذا
              الإجراء.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 rounded-xl bg-slate-800 py-3 font-medium text-white transition-colors hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl border border-red-500/30 bg-red-500/20 py-3 font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
