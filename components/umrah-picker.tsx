"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "@/components/CountUp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Dices,
  Download,
  FileSpreadsheet,
  FolderOpen,
  RefreshCcw,
  RotateCcw,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import type { FileOption, PersonEntry } from "@/lib/files-store";

interface UmrahPickerProps {
  initialFiles: FileOption[];
}

type ListMode = "files" | "people";
const SPIN_DURATION_SECONDS = 2.2;

function getPersonKey(person: Pick<PersonEntry, "cells">) {
  return person.cells.map((value) => value.trim().toLowerCase()).join("|");
}

export default function UmrahPicker({ initialFiles }: UmrahPickerProps) {
  const [files, setFiles] = useState(initialFiles);
  const [selectedFile, setSelectedFile] = useState("");
  const [allPeople, setAllPeople] = useState<PersonEntry[]>([]);
  const [people, setPeople] = useState<PersonEntry[]>([]);
  const [winners, setWinners] = useState<PersonEntry[]>([]);
  const [currentWinner, setCurrentWinner] = useState<PersonEntry | null>(null);
  const [listMode, setListMode] = useState<ListMode>("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [refreshingFiles, setRefreshingFiles] = useState(false);
  const [savingWinners, setSavingWinners] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [spinSequence, setSpinSequence] = useState<string[]>([]);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [hasDownloadedWinners, setHasDownloadedWinners] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    initialFiles.length > 0
      ? "اختر ملفًا من مجلد Files لعرض الأسماء."
      : "مجلد Files فارغ. أضف ملف Excel أولًا.",
  );
  const drawTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (drawTimeoutRef.current) {
        window.clearTimeout(drawTimeoutRef.current);
      }
    };
  }, []);

  async function loadPeople(fileName: string) {
    setLoadingPeople(true);
    setStatusMessage(`جاري تحميل ${fileName}...`);
    setSearchQuery("");

    try {
      const response = await fetch(`/api/files/people?file=${encodeURIComponent(fileName)}`);
      const data = (await response.json()) as { people?: PersonEntry[]; error?: string };

      if (!response.ok || !data.people) {
        throw new Error(data.error ?? "تعذر قراءة الملف.");
      }

      setSelectedFile(fileName);
      setAllPeople(data.people);
      setPeople(data.people);
      setWinners([]);
      setCurrentWinner(null);
      setSpinSequence([]);
      setListMode("people");
      setHasDownloadedWinners(false);
      setStatusMessage(
        data.people.length > 0
          ? `تم تحميل ${data.people.length} اسم من ${fileName}.`
          : `لا توجد أسماء داخل ${fileName}.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "تعذر قراءة الملف.");
    } finally {
      setLoadingPeople(false);
    }
  }

  async function refreshFiles() {
    setRefreshingFiles(true);

    try {
      const response = await fetch("/api/files");
      const data = (await response.json()) as { files?: FileOption[]; error?: string };

      if (!response.ok || !data.files) {
        throw new Error(data.error ?? "تعذر تحديث قائمة الملفات.");
      }

      setFiles(data.files);

      if (data.files.length === 0) {
        resetSelection();
        setStatusMessage("مجلد Files فارغ. أضف ملف Excel أولًا.");
      } else {
        setStatusMessage(`تم العثور على ${data.files.length} ملف داخل Files.`);
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "تعذر تحديث قائمة الملفات.",
      );
    } finally {
      setRefreshingFiles(false);
    }
  }

  function resetSelection() {
    if (drawTimeoutRef.current) {
      window.clearTimeout(drawTimeoutRef.current);
    }

    setSelectedFile("");
    setAllPeople([]);
    setPeople([]);
    setWinners([]);
    setCurrentWinner(null);
    setSpinSequence([]);
    setSearchQuery("");
    setListMode("files");
    setIsDrawing(false);
    setHasDownloadedWinners(false);
  }

  function handleBackToFiles() {
    if (winners.length > 0 && !hasDownloadedWinners) {
      setShowLeaveDialog(true);
      return;
    }

    resetSelection();
  }

  function resetWinners() {
    if (drawTimeoutRef.current) {
      window.clearTimeout(drawTimeoutRef.current);
    }

    setPeople(allPeople);
    setWinners([]);
    setCurrentWinner(null);
    setSpinSequence([]);
    setIsDrawing(false);
    setHasDownloadedWinners(false);
    setStatusMessage(selectedFile ? `تمت إعادة تعيين نتائج ${selectedFile}.` : statusMessage);
  }

  function pickWinner() {
    if (people.length === 0 || isDrawing) {
      return;
    }

    setIsDrawing(true);
    setCurrentWinner(null);
    const winner = people[Math.floor(Math.random() * people.length)];
    const winnerKey = getPersonKey(winner);
    const generatedSequence = Array.from(
      { length: Math.max(18, Math.min(people.length * 3, 32)) - 1 },
      () => people[Math.floor(Math.random() * people.length)].displayName,
    );

    generatedSequence.push(winner.displayName);
    setSpinSequence(generatedSequence);

    drawTimeoutRef.current = window.setTimeout(() => {
      setCurrentWinner(winner);
      setWinners((previous) => [...previous, winner]);
      setPeople((previous) =>
        previous.filter((person) => getPersonKey(person) !== winnerKey),
      );
      setHasDownloadedWinners(false);
      setStatusMessage(`تم اختيار ${winner.displayName} وحفظه في القائمة.`);
      setIsDrawing(false);
    }, SPIN_DURATION_SECONDS * 1000);
  }

  async function saveWinners() {
    if (!selectedFile || winners.length === 0 || savingWinners) {
      return;
    }

    setSavingWinners(true);

    try {
      const response = await fetch("/api/files/winners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: selectedFile,
          winners,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "تعذر تنزيل ملف الفائزين.");
      }

      const fileBlob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") ?? "";
      const fileNameMatch = /filename="([^"]+)"/.exec(contentDisposition);
      const fileName =
        fileNameMatch?.[1] ?? `winners-${selectedFile.replace(/\.[^.]+$/, "")}.xlsx`;
      const downloadUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setHasDownloadedWinners(true);
      setStatusMessage(`تم تنزيل ${fileName}.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "تعذر تنزيل ملف الفائزين.",
      );
    } finally {
      setSavingWinners(false);
    }
  }

  const filteredPeople = people.filter((person) =>
    person.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const availableCount = people.length;

  return (
    <main
      className="h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-transparent"
      dir="rtl"
    >
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/makka.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/75 to-slate-950/90" />
        <div className="absolute inset-0 bg-emerald-950/10 mix-blend-overlay" />
      </div>

      <div className="relative z-10 h-full p-3 md:p-4">
        <div className="glass-card flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-transparent md:p-4">
          <section className="mb-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:mb-4 md:p-6">
            <div className="flex h-full flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="min-w-0">
                <h1 className="bg-gradient-to-r from-emerald-200 via-white to-emerald-200 bg-clip-text text-3xl leading-tight font-bold text-transparent md:text-5xl">
                  اختيار عشوائي للعمرة
                </h1>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<FileSpreadsheet className="h-5 w-5" />}
                  label="الملفات"
                  value={files.length}
                />
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  label="الأسماء"
                  value={allPeople.length}
                />
                <StatCard
                  icon={<Trophy className="h-5 w-5" />}
                  label="الفائزون"
                  value={winners.length}
                />
              </div>
              <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                    <Dices className={`h-6 w-6 ${isDrawing ? "animate-spin" : ""}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">لوحة السحب</h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatMini label="المتبقي" value={Math.max(availableCount, 0)} />
                  <StatMini label="المختارون" value={winners.length} />
                </div>
              </div>
            </div>
          </section>

          <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.15fr_0.95fr]">
            <div className="grid min-h-0 gap-3 lg:grid-rows-[minmax(0,1fr)_auto]">
              <div className="glass-card min-h-0 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                      {listMode === "files" ? (
                        <FolderOpen className="h-6 w-6" />
                      ) : (
                        <Users className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {listMode === "files" ? "قائمة الملفات" : "قائمة الأسماء"}
                      </h2>
                      <p className="text-sm text-slate-400">
                        {listMode === "files"
                          ? "ابدأ باختيار ملف Excel من مجلد Files"
                          : selectedFile}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {listMode === "people" && (
                      <button
                        type="button"
                        onClick={handleBackToFiles}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:border-emerald-500/30 hover:bg-slate-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                        رجوع إلى الملفات
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={refreshFiles}
                      disabled={refreshingFiles}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:border-emerald-500/30 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCcw
                        className={`h-4 w-4 text-emerald-400 ${
                          refreshingFiles ? "animate-spin" : ""
                        }`}
                      />
                      تحديث
                    </button>
                  </div>
                </div>

                {listMode === "people" && (
                  <div className="relative mb-4">
                    <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="البحث في الأسماء..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2 pr-10 pl-4 text-slate-200 placeholder:text-slate-500 transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>
                )}

                <div className="custom-scrollbar h-[calc(100%-5rem)] overflow-y-auto pr-1">
                  <div className="space-y-2">
                    {listMode === "files" ? (
                      files.length === 0 ? (
                        <EmptyState text="لا توجد ملفات داخل مجلد Files." />
                      ) : (
                        files.map((file, index) => (
                          <button
                            key={file.name}
                            type="button"
                            onClick={() => loadPeople(file.name)}
                            className="flex w-full items-center justify-between rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 text-right text-slate-300 transition hover:border-emerald-500/30 hover:bg-slate-800/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 text-sm text-slate-500">{index + 1}</span>
                              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-white">{file.label}</p>
                                <p className="truncate text-xs text-slate-500">{file.name}</p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          </button>
                        ))
                      )
                    ) : loadingPeople ? (
                      <EmptyState text="جاري تحميل الأسماء..." />
                    ) : filteredPeople.length === 0 ? (
                      <EmptyState text="لا توجد نتائج مطابقة." />
                    ) : (
                      filteredPeople.map((person, index) => {
                        const picked = winners.some((winner) => winner.id === person.id);

                        return (
                          <div
                            key={person.id}
                            className={`flex items-center justify-between rounded-2xl border p-4 ${
                              picked
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                : "border-slate-700/50 bg-slate-800/30 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 text-sm text-slate-500">{index + 1}</span>
                              <div className="min-w-0">
                                <span className="block truncate font-medium">
                                  {person.displayName}
                                </span>
                                <span className="block truncate text-xs text-slate-500">
                                  {person.cells.length} أعمدة
                                </span>
                              </div>
                              {picked && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              )}
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                picked
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "bg-slate-700/50 text-slate-400"
                              }`}
                            >
                              {picked ? "تم الاختيار" : "بانتظار السحب"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <div
                  className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${
                    statusMessage.includes("تعذر") || statusMessage.includes("فارغ")
                      ? "border-red-500/20 bg-red-500/10 text-red-300"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {statusMessage.includes("تعذر") || statusMessage.includes("فارغ") ? (
                    <AlertCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  )}
                  <span>{statusMessage}</span>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 gap-3 lg:grid-rows-[auto_auto_auto]">
              

                <div className="relative rounded-3xl bg-gradient-to-br from-emerald-400/50 via-amber-200/30 to-emerald-400/50 p-1">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-400/20 via-amber-300/20 to-emerald-400/20 blur-2xl" />
                <div className="relative rounded-[22px] border border-white/10 bg-slate-900/90 p-6 text-center backdrop-blur-2xl">
                  <div className="mb-3 text-sm font-medium uppercase tracking-wider text-emerald-400">
                    {isDrawing ? "جاري السحب" : "آخر اختيار"}
                  </div>
                  <h2 className="min-h-30 text-3xl leading-relaxed font-bold text-white md:text-4xl">
                    {isDrawing ? (
                      <CountUp
                        key={spinSequence.join("|")}
                        from={0}
                        to={Math.max(spinSequence.length - 1, 0)}
                        separator=","
                        direction="up"
                        duration={SPIN_DURATION_SECONDS}
                        className="count-up-text winner-spinning block"
                        startCounting
                        items={spinSequence}
                      />
                    ) : (
                      currentWinner?.displayName || "لا يوجد اسم بعد"
                    )}
                  </h2>
                  <div className="mt-3 flex items-center justify-center gap-2 text-amber-300/80">
                    <span className="text-lg">✦</span>
                    <span className="text-sm md:text-base">بالتوفيق في رحلة العمرة</span>
                    <span className="text-lg">✦</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={pickWinner}
                  disabled={
                    !selectedFile ||
                    loadingPeople ||
                    people.length === 0 ||
                    availableCount === 0 ||
                    isDrawing
                  }
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold text-white transition-all duration-300 ${
                    !selectedFile ||
                    loadingPeople ||
                    people.length === 0 ||
                    availableCount === 0 ||
                    isDrawing
                      ? "cursor-not-allowed bg-slate-700"
                      : "bg-linear-to-bl from-emerald-600 to-lime-400 hover:scale-[1.02] hover:from-emerald-500 hover:to-lime-300"
                  }`}
                >
                  <Dices className="h-5 w-5" />
                  {isDrawing ? "جاري الاختيار..." : "اختيار اسم عشوائي"}
                </button>

                <button
                  type="button"
                  onClick={saveWinners}
                  disabled={winners.length === 0 || savingWinners}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-4 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/30 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-5 w-5 text-emerald-400" />
                  {savingWinners ? "جاري التنزيل..." : "تنزيل Excel"}
                </button>

                <button
                  type="button"
                  onClick={resetWinners}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-4 font-medium text-red-400 transition-all duration-300 hover:scale-[1.02] hover:bg-red-500/20"
                >
                  <RotateCcw className="h-5 w-5" />
                  إعادة التعيين
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="border border-white/10 bg-slate-900 text-slate-100">
          <AlertDialogHeader className="place-items-start text-right sm:text-right">
            <AlertDialogTitle className="w-full text-right text-white">
              الرجوع إلى الملفات؟
            </AlertDialogTitle>
            <AlertDialogDescription className="w-full text-right text-slate-400">
              إذا رجعت الآن فسيتم حذف نتائج السحب الحالية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-white/10 bg-slate-900/80 sm:justify-start">
            <AlertDialogCancel className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-red-200"
              onClick={resetSelection}
            >
              متابعة والرجوع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center justify-between text-emerald-400">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-800/20 p-8 text-center text-slate-500">
      {text}
    </div>
  );
}
