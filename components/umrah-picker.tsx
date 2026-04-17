"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
type PeopleViewMode = "people" | "winners";

const SPIN_DURATION_SECONDS = 2.2;
const SHUFFLE_DURATION_MS = 500;

function getPersonKey(person: Pick<PersonEntry, "cells">) {
  return person.cells.map((value) => value.trim().toLowerCase()).join("|");
}

function shuffleEntries(entries: PersonEntry[]) {
  const nextEntries = [...entries];

  for (let index = nextEntries.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextEntries[index], nextEntries[randomIndex]] = [nextEntries[randomIndex], nextEntries[index]];
  }

  return nextEntries;
}

export default function UmrahPicker({ initialFiles }: UmrahPickerProps) {
  const [files, setFiles] = useState(initialFiles);
  const [selectedFile, setSelectedFile] = useState("");
  const [allPeople, setAllPeople] = useState<PersonEntry[]>([]);
  const [people, setPeople] = useState<PersonEntry[]>([]);
  const [winners, setWinners] = useState<PersonEntry[]>([]);
  const [currentWinner, setCurrentWinner] = useState<PersonEntry | null>(null);
  const [listMode, setListMode] = useState<ListMode>("files");
  const [peopleViewMode, setPeopleViewMode] = useState<PeopleViewMode>("people");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [refreshingFiles, setRefreshingFiles] = useState(false);
  const [savingWinners, setSavingWinners] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
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
  const shuffleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (drawTimeoutRef.current) {
        window.clearTimeout(drawTimeoutRef.current);
      }

      if (shuffleTimeoutRef.current) {
        window.clearTimeout(shuffleTimeoutRef.current);
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
      setPeopleViewMode("people");
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

    if (shuffleTimeoutRef.current) {
      window.clearTimeout(shuffleTimeoutRef.current);
    }

    setSelectedFile("");
    setAllPeople([]);
    setPeople([]);
    setWinners([]);
    setCurrentWinner(null);
    setSpinSequence([]);
    setSearchQuery("");
    setListMode("files");
    setPeopleViewMode("people");
    setIsDrawing(false);
    setIsShuffling(false);
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

    if (shuffleTimeoutRef.current) {
      window.clearTimeout(shuffleTimeoutRef.current);
    }

    setPeople(allPeople);
    setWinners([]);
    setCurrentWinner(null);
    setSpinSequence([]);
    setPeopleViewMode("people");
    setIsDrawing(false);
    setIsShuffling(false);
    setHasDownloadedWinners(false);
    setStatusMessage(selectedFile ? `تمت إعادة تعيين نتائج ${selectedFile}.` : statusMessage);
  }

  function shufflePeople() {
    if (people.length < 2 || isDrawing || isShuffling) {
      return;
    }

    if (shuffleTimeoutRef.current) {
      window.clearTimeout(shuffleTimeoutRef.current);
    }

    setIsShuffling(true);
    setPeople((previous) => shuffleEntries(previous));
    setStatusMessage("تم خلط قائمة الأسماء.");

    shuffleTimeoutRef.current = window.setTimeout(() => {
      setIsShuffling(false);
    }, SHUFFLE_DURATION_MS);
  }

  function pickWinner() {
    if (people.length === 0 || isDrawing) {
      return;
    }

    setIsDrawing(true);
    setPeopleViewMode("winners");
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
      setStatusMessage(`تم اختيار ${winner.displayName} وحفظه في قائمة الفائزين.`);
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
  const showWinnersList = listMode === "people" && peopleViewMode === "winners";
  const isStatusError = statusMessage.includes("تعذر") || statusMessage.includes("فارغ");

  return (
    <main
      className="h-screen overflow-hidden bg-stone-50 text-slate-900 selection:bg-emerald-100"
      dir="rtl"
    >
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_42%),linear-gradient(180deg,_#fffdf7_0%,_#f8fafc_52%,_#eef7f1_100%)]" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
          style={{ backgroundImage: "url('/makka.jpg')" }}
        />
      </div>

      <div className="relative z-10 h-full p-3 md:p-4">
        <div className="flex h-full min-h-0 flex-col rounded-[32px] border border-emerald-100/80 bg-white/88 p-3 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.35)] backdrop-blur md:p-4">
          <section className="mb-3 rounded-[28px] border border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-amber-50 p-4 md:mb-4 md:p-6">
            <div className="flex h-full flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="min-w-0">
                <h1 className="text-2xl leading-tight font-extrabold text-slate-900 md:text-5xl">
                  سحب واختيار الفائزين للعمرة
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                  اختر ملف الأسماء أولًا، ثم ابدأ السحب ليتم عرض الفائزين مباشرة في
                  القائمة بشكل واضح وسهل المتابعة.
                </p>
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
            </div>
          </section>

          <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.15fr_0.95fr]">
            <div className="grid min-h-0 gap-3 lg:grid-rows-[minmax(0,1fr)_auto]">
              <div className="min-h-0 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      {listMode === "files" ? (
                        <FolderOpen className="h-6 w-6" />
                      ) : showWinnersList ? (
                        <Trophy className="h-6 w-6" />
                      ) : (
                        <Users className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {listMode === "files"
                          ? "ملفات السحب"
                          : showWinnersList
                            ? "قائمة الفائزين"
                            : "الأسماء المشاركة"}
                      </h2>
                      <p className="text-sm text-slate-600">
                        {listMode === "files"
                          ? "ابدأ باختيار ملف Excel من مجلد Files"
                          : showWinnersList
                            ? `الفائزون من ${selectedFile}`
                            : `الأسماء الموجودة في ${selectedFile}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {listMode === "people" && (
                      <div className="inline-flex rounded-xl border border-slate-200 bg-stone-50 p-1">
                        <button
                          type="button"
                          onClick={() => setPeopleViewMode("people")}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            !showWinnersList
                              ? "bg-white text-emerald-800 shadow-sm"
                              : "text-slate-600 hover:text-slate-800"
                          }`}
                        >
                          الأسماء
                        </button>
                        <button
                          type="button"
                          onClick={() => setPeopleViewMode("winners")}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            showWinnersList
                              ? "bg-white text-emerald-800 shadow-sm"
                              : "text-slate-600 hover:text-slate-800"
                          }`}
                        >
                          الفائزون
                        </button>
                      </div>
                    )}

                    {listMode === "people" && (
                      <button
                        type="button"
                        onClick={shufflePeople}
                        disabled={loadingPeople || people.length < 2 || isDrawing || isShuffling}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCcw
                          className={`h-4 w-4 text-emerald-700 ${
                            isShuffling ? "animate-spin" : ""
                          }`}
                        />
                        خلط القائمة
                      </button>
                    )}

                    {listMode === "people" && (
                      <button
                        type="button"
                        onClick={handleBackToFiles}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                        رجوع إلى الملفات
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={refreshFiles}
                      disabled={refreshingFiles}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCcw
                        className={`h-4 w-4 text-emerald-700 ${
                          refreshingFiles ? "animate-spin" : ""
                        }`}
                      />
                      تحديث الملفات
                    </button>
                  </div>
                </div>

                {listMode === "people" && !showWinnersList && (
                  <div className="relative mb-4">
                    <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث داخل الأسماء..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-stone-50 py-2 pr-10 pl-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
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
                            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-stone-50 p-4 text-right text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 text-sm font-medium text-slate-500">{index + 1}</span>
                              <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">{file.label}</p>
                                <p className="truncate text-xs text-slate-500">{file.name}</p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        ))
                      )
                    ) : loadingPeople ? (
                      <EmptyState text="جاري تحميل الأسماء..." />
                    ) : showWinnersList ? (
                      winners.length === 0 && isDrawing ? (
                        <EmptyState text="جاري بدء سحب الفائزين..." />
                      ) : winners.length === 0 ? (
                        <EmptyState text="لا يوجد فائزون بعد." />
                      ) : (
                        <AnimatePresence initial={false}>
                          {winners.map((winner, index) => (
                            <motion.div
                              key={`${winner.id}-${index}`}
                              layout
                              initial={{ opacity: 0, y: 14, scale: 0.985 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -14, scale: 0.985 }}
                              transition={{
                                layout: {
                                  duration: 0.45,
                                  ease: [0.22, 1, 0.36, 1],
                                },
                                duration: 0.22,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 text-sm font-medium text-emerald-700/80">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <span className="block truncate font-semibold">
                                    {winner.displayName}
                                  </span>
                                  <span className="block truncate text-xs text-emerald-800/70">
                                    {winner.cells.length} أعمدة
                                  </span>
                                </div>
                                <Trophy className="h-4 w-4 text-amber-500" />
                              </div>
                              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-emerald-800">
                                تم الاختيار
                              </span>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )
                    ) : filteredPeople.length === 0 ? (
                      <EmptyState text="لا توجد نتائج مطابقة." />
                    ) : (
                      <AnimatePresence initial={false}>
                        {filteredPeople.map((person, index) => {
                          const picked = winners.some((winner) => winner.id === person.id);

                          return (
                            <motion.div
                              key={person.id}
                              layout
                              initial={{ opacity: 0, y: 14, scale: 0.985 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -14, scale: 0.985 }}
                              transition={{
                                layout: {
                                  duration: 0.45,
                                  ease: [0.22, 1, 0.36, 1],
                                },
                                duration: 0.22,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className={`flex items-center justify-between rounded-2xl border p-4 ${
                                picked
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                  : "border-slate-200 bg-stone-50 text-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 text-sm font-medium text-slate-500">
                                  {index + 1}
                                </span>
                                <div className="min-w-0">
                                  <span className="block truncate font-semibold">
                                    {person.displayName}
                                  </span>
                                  <span className="block truncate text-xs text-slate-500">
                                    {person.cells.length} أعمدة
                                  </span>
                                </div>
                                {picked && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                )}
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  picked
                                    ? "bg-white text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {picked ? "تم الاختيار" : "بانتظار السحب"}
                              </span>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div
                  className={`flex items-center gap-3 rounded-xl border p-4 text-sm leading-7 ${
                    isStatusError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {isStatusError ? (
                    <AlertCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  )}
                  <span>{statusMessage}</span>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 gap-3 lg:grid-rows-[auto_auto_auto]">
              <div className="relative rounded-[28px] bg-gradient-to-br from-emerald-200 via-amber-100 to-white p-1">
                <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-emerald-200/60 via-amber-100/60 to-emerald-100/60 blur-2xl" />
                <div className="relative rounded-[24px] border border-white/80 bg-white/95 p-6 text-center shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
                  <div className="mb-3 text-sm font-semibold tracking-wide text-emerald-700">
                    {isDrawing ? "جاري السحب الآن" : "آخر فائز تم اختياره"}
                  </div>
                  <h2 className="min-h-30 text-3xl leading-relaxed font-extrabold text-slate-900 md:text-4xl">
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
                      currentWinner?.displayName || "لم يتم اختيار اسم بعد"
                    )}
                  </h2>
                  <div className="mt-3 flex items-center justify-center gap-2 text-amber-700">
                    <span className="text-lg">*</span>
                    <span className="text-sm md:text-base">بالتوفيق في رحلة العمرة</span>
                    <span className="text-lg">*</span>
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
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold transition-all duration-300 ${
                    !selectedFile ||
                    loadingPeople ||
                    people.length === 0 ||
                    availableCount === 0 ||
                    isDrawing
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-gradient-to-l from-emerald-600 to-lime-500 text-white hover:scale-[1.02] hover:from-emerald-500 hover:to-lime-400"
                  }`}
                >
                  <Dices className="h-5 w-5" />
                  {isDrawing ? "جاري الاختيار..." : "ابدأ سحب فائز"}
                </button>

                <button
                  type="button"
                  onClick={saveWinners}
                  disabled={winners.length === 0 || savingWinners}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 font-medium text-slate-800 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-5 w-5 text-emerald-700" />
                  {savingWinners ? "جاري التنزيل..." : "تنزيل ملف Excel"}
                </button>

                <button
                  type="button"
                  onClick={resetWinners}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-4 font-medium text-red-700 transition-all duration-300 hover:scale-[1.02] hover:bg-red-100"
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
        <AlertDialogContent className="border border-slate-200 bg-white text-slate-900">
          <AlertDialogHeader className="place-items-start text-right sm:text-right">
            <AlertDialogTitle className="w-full text-right text-slate-900">
              الرجوع إلى الملفات؟
            </AlertDialogTitle>
            <AlertDialogDescription className="w-full text-right text-slate-600">
              إذا رجعت الآن فسيتم حذف نتائج السحب الحالية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-start">
            <AlertDialogCancel className="border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-900">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
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
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-emerald-700">
        {icon}
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-stone-50 p-8 text-center text-slate-600">
      {text}
    </div>
  );
}
