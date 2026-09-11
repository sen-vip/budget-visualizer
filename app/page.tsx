"use client";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUp,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Landmark,
  ListChecks,
  LockKeyhole,
  Minus,
  ReceiptText,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Trash2,
  UploadCloud,
  WalletCards,
  UserRound,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type ViewTab = "overview" | "promotion" | "closing";
type MainView = "mine" | "plan" | "school";
type BusinessFilter = "all" | "available" | "complete";
type BusinessSort = "name-asc" | "name-desc" | "project-asc" | "project-desc" | "item-asc" | "item-desc" | "amount-desc" | "amount-asc";
type BusinessViewMode = "project" | "item" | "detail";
const BUSINESS_COST_FILTER_ALL = "__all_costs__";
const BUSINESS_COST_FILTER_PROMOTION = "__all_promotion_costs__";
type FundType = "school" | "purpose" | "revenue" | "conflict";
type FundFilter = "all" | Exclude<FundType, "conflict">;
type AttentionKind = "all" | "overrun" | "unspent" | "low" | "large" | "nearly" | "pending";
type SchoolHierarchyLevel = "policy" | "unit" | "project" | "item";
type SchoolSort = "budget-desc" | "budget-asc" | "obligation-desc" | "obligation-asc" | "obligation-rate-desc" | "obligation-rate-asc" | "paid-desc" | "paid-asc" | "pending-desc" | "pending-asc" | "uncommitted-desc" | "uncommitted-asc" | "name-asc";

type BudgetRow = {
  year: string;
  executionDate: string;
  schoolCode: string;
  schoolName: string;
  policyCode: string;
  policyName: string;
  unitCode: string;
  unitName: string;
  projectCode: string;
  projectName: string;
  itemCode: string;
  itemName: string;
  accountCode: string;
  accountName: string;
  subAccountCode: string;
  subAccountName: string;
  costCode: string;
  costName: string;
  calculation: string;
  budget: number;
  obligation: number;
  paid: number;
  carryover: number;
  available: number;
  fundType: FundType;
};

type BudgetGroup = {
  id: string;
  policyName: string;
  unitName: string;
  projectName: string;
  budget: number;
  obligation: number;
  paid: number;
  carryover: number;
  available: number;
  pending: number;
  rate: number;
  fundTypes: Set<BudgetRow["fundType"]>;
  rows: BudgetRow[];
};

type PromotionGroup = {
  id: string;
  projectName: string;
  itemName: string;
  budget: number;
  obligation: number;
  paid: number;
  available: number;
  rate: number;
  rows: BudgetRow[];
};

type PromotionDetail = {
  id: string;
  groupId: string;
  projectName: string;
  itemName: string;
  costName: string;
  calculation: string;
  budget: number;
  obligation: number;
  paid: number;
  available: number;
};

type Plan = { amount: number; month: string; memo: string; updatedAt: string; reviewedBalance?: number };
type FileMeta = { fileName: string; year: string; executionDate: string; schoolCode: string; schoolName: string; rowCount: number };
type RevenueRow = {
  year: string;
  executionDate: string;
  schoolCode: string;
  schoolName: string;
  sectionCode: string;
  sectionName: string;
  categoryCode: string;
  categoryName: string;
  costCode: string;
  costName: string;
  budget: number;
  assessment: number;
  collected: number;
  badDebt: number;
  uncollected: number;
  budgetGap: number;
};
type ClosingInputs = {
  schemaVersion: 2;
  additionalReceipts: Record<string, number>;
  otherFutureSpending?: number;
  extraFutureSpending: number;
  legacyFutureSpending: number;
  legacyDecision: "none" | "pending" | "keep" | "discard";
  detailSpendingPlans: Record<string, DetailSpendingPlan>;
  nextCarryover: number;
  returns: number;
  otherDeductions: number;
  transferReturns: Record<string, TransferReturnPlan>;
  memo: string;
};
type DetailSpendingMode = "full" | "partial" | "none";
type DetailSpendingPlan = {
  mode: DetailSpendingMode;
  amount: number;
  reviewedBalance: number;
  updatedAt: string;
};
type SpendingDetail = {
  id: string;
  projectCode: string;
  projectName: string;
  itemName: string;
  costName: string;
  calculation: string;
  available: number;
};
type TransferReturnPlan = {
  amount: number;
  schedule: "12월" | "회계연도 말" | "시기 미정";
  memo: string;
  includedInSpending: boolean;
  updatedAt: string;
};
type ClosingAmountField = "extraFutureSpending" | "nextCarryover" | "returns" | "otherDeductions";

type SchoolAnalysisGroup = {
  id: string;
  level: SchoolHierarchyLevel;
  label: string;
  parentLabel: string;
  budget: number;
  obligation: number;
  paid: number;
  carryover: number;
  pending: number;
  uncommitted: number;
  obligationRate: number;
  spendingRate: number;
  rows: BudgetRow[];
};

type BusinessCardRow = {
  id: string;
  projectName: string;
  itemName: string;
  costName: string;
  calculation: string;
  originalBudget: number;
  adjustment: number;
  currentBudget: number;
  requestAmount: number;
  obligation: number;
  budgetBalance: number;
  resolution: number;
  paid: number;
  paymentBalance: number;
  settlementFund: number;
  generalFund: number;
  managers: string[];
};

type BusinessCardMeta = {
  fileName: string;
  year: string;
  rowCount: number;
  hasManager: boolean;
  sourceLabel: string;
  hasPaymentDetail: boolean;
};

type BusinessItemGroup = {
  id: string;
  projectName: string;
  itemName: string;
  currentBudget: number;
  obligation: number;
  paid: number;
  budgetBalance: number;
  paymentBalance: number;
  rows: BusinessCardRow[];
};

type BusinessProjectGroup = {
  id: string;
  projectName: string;
  currentBudget: number;
  obligation: number;
  paid: number;
  budgetBalance: number;
  paymentBalance: number;
  rows: BusinessCardRow[];
  items: BusinessItemGroup[];
};

type BusinessPlanItemGroup = {
  id: string;
  projectName: string;
  itemName: string;
  budgetBalance: number;
  rows: BusinessCardRow[];
};

type BusinessPlanProjectGroup = {
  id: string;
  projectName: string;
  budgetBalance: number;
  rows: BusinessCardRow[];
  items: BusinessPlanItemGroup[];
};

const APP_VERSION = "v0.6.44";
const STORAGE_KEY = "hakdol-expense-dashboard-plans-v1";
const CLOSING_STORAGE_KEY = "hakdol-expense-dashboard-closing-v1";
const BUSINESS_PLAN_STORAGE_KEY = "hakdol-business-card-plans-v1";
const formatWon = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const formatCompactWon = (value: number) => {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "-" : "";
  if (abs < 10_000) return `${sign}${abs.toLocaleString("ko-KR")}원`;

  // 먼저 만원 단위로 반올림한 뒤 억/만원을 나눠, 9,999만원대 반올림 시 단위 올림도 자연스럽게 처리합니다.
  const totalMan = Math.round(abs / 10_000);
  const eok = Math.floor(totalMan / 10_000);
  const man = totalMan % 10_000;
  if (eok) return `${sign}${eok.toLocaleString("ko-KR")}억${man ? ` ${man.toLocaleString("ko-KR")}만원` : "원"}`;
  return `${sign}${totalMan.toLocaleString("ko-KR")}만원`;
};
const formatReadableWon = (value: number) => {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? "-" : "";
  if (abs < 10_000) return `${sign}${abs.toLocaleString("ko-KR")}원`;
  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const won = abs % 10_000;
  const parts: string[] = [];
  if (eok) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (won) parts.push(won.toLocaleString("ko-KR"));
  return `${sign}${parts.join(" ")}원`;
};
// KPI와 그래프 범례는 같은 요약 포맷터를 사용해 만원 단위 반올림 규칙을 통일합니다.
const formatKpiWon = (value: number) => formatCompactWon(value);
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

function ForecastAmount({ value, compact = false, showWarning = false }: { value: number; compact?: boolean; showWarning?: boolean }) {
  const negative = value < 0;
  return <>
    <strong className={negative ? "negative-value" : ""}>{compact ? formatCompactWon(value) : formatWon(value)}</strong>
    {negative && showWarning && <em className="forecast-overrun"><AlertCircle size={12} />예산 초과 {formatWon(Math.abs(value))}</em>}
  </>;
}
const normalize = (value: unknown) => String(value ?? "").replace(/[\s\n\r]/g, "").trim();
type SortableBusiness = { projectName: string; budgetBalance: number; itemName?: string; calculation?: string };
const compareText = (a: string, b: string) => a.localeCompare(b, "ko-KR", { numeric: true, sensitivity: "base" });
const compareBusiness = (a: SortableBusiness, b: SortableBusiness, sort: BusinessSort) => {
  if (sort === "amount-desc") return b.budgetBalance - a.budgetBalance;
  if (sort === "amount-asc") return a.budgetBalance - b.budgetBalance;

  if (sort === "project-asc" || sort === "project-desc") {
    const compared = compareText(a.projectName || "", b.projectName || "");
    if (compared) return sort === "project-desc" ? -compared : compared;
    return compareText(a.itemName ?? "", b.itemName ?? "");
  }

  if (sort === "item-asc" || sort === "item-desc") {
    const compared = compareText(a.itemName ?? "", b.itemName ?? "");
    if (compared) return sort === "item-desc" ? -compared : compared;
    return compareText(a.projectName || "", b.projectName || "");
  }

  const aName = `${a.projectName} ${a.itemName ?? ""} ${a.calculation ?? ""}`.trim();
  const bName = `${b.projectName} ${b.itemName ?? ""} ${b.calculation ?? ""}`.trim();
  const compared = compareText(aName, bName);
  return sort === "name-desc" ? -compared : compared;
};
const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (!normalized) return 0;
  const parsed = Number(normalized.replace(/^\((.*)\)$/, "-$1"));
  return Number.isFinite(parsed) ? parsed : 0;
};
const dateLabel = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value || "기준일 미확인";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}.`;
};

function koreanMoney(value: number) {
  if (!value) return "영원";
  const digitNames = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const smallUnits = ["", "십", "백", "천"];
  const bigUnits = ["", "만", "억", "조"];
  let remaining = Math.abs(Math.floor(value));
  const chunks: string[] = [];
  let chunkIndex = 0;
  while (remaining > 0) {
    const chunk = remaining % 10_000;
    if (chunk) {
      let chunkText = "";
      for (let i = 0; i < 4; i += 1) {
        const digit = Math.floor(chunk / 10 ** i) % 10;
        if (!digit) continue;
        const digitText = digit === 1 && i > 0 ? "" : digitNames[digit];
        chunkText = `${digitText}${smallUnits[i]}${chunkText}`;
      }
      chunks.unshift(`${chunkText}${bigUnits[chunkIndex]}`);
    }
    remaining = Math.floor(remaining / 10_000);
    chunkIndex += 1;
  }
  return `${value < 0 ? "마이너스 " : ""}${chunks.join(" ")}원`;
}

const PURPOSE_FUND_MARKERS = new Set(["목", "목적", "목적사업", "목적사업비"]);
const REVENUE_FUND_MARKERS = new Set(["수", "수익", "수익자", "수익자부담", "수익자부담경비"]);

function detectFundMarkers(value: unknown): Set<Exclude<FundType, "school" | "conflict">> {
  const text = normalize(value)
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[［]/g, "[")
    .replace(/[］]/g, "]");
  const detected = new Set<Exclude<FundType, "school" | "conflict">>();
  const markerPattern = /(?:\((목적사업비|목적사업|목적|목|수익자부담경비|수익자부담|수익자|수익|수)\)|\[(목적사업비|목적사업|목적|목|수익자부담경비|수익자부담|수익자|수익|수)\])/g;
  let match: RegExpExecArray | null;
  while ((match = markerPattern.exec(text)) !== null) {
    const marker = match[1] ?? match[2] ?? "";
    if (PURPOSE_FUND_MARKERS.has(marker)) detected.add("purpose");
    if (REVENUE_FUND_MARKERS.has(marker)) detected.add("revenue");
  }
  return detected;
}

const rowFundType = (itemName: string, calculation: string): BudgetRow["fundType"] => {
  const detected = new Set<Exclude<FundType, "school" | "conflict">>([
    ...detectFundMarkers(itemName),
    ...detectFundMarkers(calculation),
  ]);
  if (detected.size > 1) return "conflict";
  if (detected.has("purpose")) return "purpose";
  if (detected.has("revenue")) return "revenue";
  return "school";
};

const businessPlanKey = (meta: BusinessCardMeta, row: BusinessCardRow) => `${meta.year}::${row.id}`;
function readBusinessPlans() {
  try { return JSON.parse(localStorage.getItem(BUSINESS_PLAN_STORAGE_KEY) ?? "{}") as Record<string, number>; }
  catch { return {}; }
}

async function parseBusinessCard(file: File): Promise<{ rows: BusinessCardRow[]; meta: BusinessCardMeta }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) throw new Error("엑셀 시트를 찾을 수 없습니다.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: true, defval: null }) as unknown[][];
  const year = file.name.match(/20\d{2}/)?.[0] ?? String(new Date().getFullYear());
  const cell = (row: unknown[], index: number) => index >= 0 ? row[index] : null;

  const mergeRow = (detailMap: Map<string, BusinessCardRow>, row: BusinessCardRow) => {
    const existing = detailMap.get(row.id);
    if (!existing) {
      detailMap.set(row.id, row);
      return;
    }
    detailMap.set(row.id, {
      ...existing,
      originalBudget: existing.originalBudget + row.originalBudget,
      adjustment: existing.adjustment + row.adjustment,
      currentBudget: existing.currentBudget + row.currentBudget,
      requestAmount: existing.requestAmount + row.requestAmount,
      obligation: existing.obligation + row.obligation,
      budgetBalance: existing.budgetBalance + row.budgetBalance,
      resolution: existing.resolution + row.resolution,
      paid: existing.paid + row.paid,
      paymentBalance: existing.paymentBalance + row.paymentBalance,
      settlementFund: existing.settlementFund + row.settlementFund,
      generalFund: existing.generalFund + row.generalFund,
      managers: [...new Set([...existing.managers, ...row.managers])],
    });
  };

  // 기존 사업관리카드(현액): 세부사업·세부항목·원가통계비목이 각각 독립 열인 형식
  const wideHeaderRowIndex = matrix.findIndex((row) => {
    const headers = row.map(normalize);
    return headers.includes("세부사업") && headers.includes("세부항목") && headers.includes("산출내역") && headers.some((header) => header.startsWith("예산현액"));
  });

  if (wideHeaderRowIndex >= 0) {
    const headers = matrix[wideHeaderRowIndex].map(normalize);
    const exact = (name: string) => headers.findIndex((header) => header === normalize(name));
    const starts = (...names: string[]) => headers.findIndex((header) => names.some((name) => header.startsWith(normalize(name))));
    const columns = {
      projectName: exact("세부사업"), itemName: exact("세부항목"), costName: exact("원가통계비목"), calculation: exact("산출내역"),
      originalBudget: starts("예산액"), adjustment: starts("증감액"), currentBudget: starts("예산현액"), requestAmount: starts("지출품의액", "지출품의금액"),
      obligation: starts("원인행위액", "원인행위금액"), budgetBalance: starts("예산잔액"), resolution: starts("지출결의액", "지출결의금액"), paid: starts("지급액"),
      paymentBalance: starts("지출잔액"), settlementFund: starts("정산재원"), generalFund: starts("일반재원"), managers: exact("세부항목담당자"),
    };
    const required = [columns.projectName, columns.itemName, columns.costName, columns.calculation, columns.currentBudget, columns.obligation, columns.budgetBalance, columns.paid];
    if (required.some((index) => index < 0)) throw new Error("필수 열이 부족합니다. 사업관리카드 파일인지 확인해주세요.");

    const detailMap = new Map<string, BusinessCardRow>();
    matrix.slice(wideHeaderRowIndex + 1).forEach((rawRow) => {
      const calculation = String(cell(rawRow, columns.calculation) ?? "").trim();
      const projectName = String(cell(rawRow, columns.projectName) ?? "").trim();
      const itemName = String(cell(rawRow, columns.itemName) ?? "").trim();
      const costName = String(cell(rawRow, columns.costName) ?? "").trim();
      const summaryText = normalize(`${projectName}${itemName}${costName}`);
      if (!calculation || summaryText.includes("소계") || summaryText.includes("합계")) return;
      const managers = String(cell(rawRow, columns.managers) ?? "").split(/[,;/·\n]+/).map((name) => name.trim()).filter(Boolean);
      const id = [normalize(projectName), normalize(itemName), normalize(costName), normalize(calculation)].join("|");
      const currentBudget = numberValue(cell(rawRow, columns.currentBudget));
      const obligation = numberValue(cell(rawRow, columns.obligation));
      const paid = numberValue(cell(rawRow, columns.paid));
      const row: BusinessCardRow = {
        id, projectName, itemName, costName, calculation,
        originalBudget: numberValue(cell(rawRow, columns.originalBudget)), adjustment: numberValue(cell(rawRow, columns.adjustment)), currentBudget,
        requestAmount: numberValue(cell(rawRow, columns.requestAmount)), obligation,
        budgetBalance: columns.budgetBalance >= 0 ? numberValue(cell(rawRow, columns.budgetBalance)) : currentBudget - obligation,
        resolution: numberValue(cell(rawRow, columns.resolution)), paid,
        paymentBalance: columns.paymentBalance >= 0 ? numberValue(cell(rawRow, columns.paymentBalance)) : currentBudget - paid,
        settlementFund: numberValue(cell(rawRow, columns.settlementFund)), generalFund: numberValue(cell(rawRow, columns.generalFund)), managers,
      };
      mergeRow(detailMap, row);
    });
    const rows = [...detailMap.values()];
    if (!rows.length) throw new Error("실제 산출내역 행을 찾지 못했습니다. 사업관리카드 파일인지 확인해주세요.");
    return { rows, meta: { fileName: file.name, year, rowCount: rows.length, hasManager: columns.managers >= 0, sourceLabel: "사업관리카드(현액)", hasPaymentDetail: true } };
  }

  // 사업관리카드(예산)·세출예산집행현황목록: 한 열의 들여쓰기로 세부사업/세부항목/원가통계비목을 표현하는 형식
  const compactHeaderRowIndex = matrix.findIndex((row) => {
    const headers = row.map(normalize);
    return headers.some((header) => header.includes("세부사업/세부항목/원가통계비목")) && headers.includes("산출내역") && headers.some((header) => header.startsWith("예산현액"));
  });
  if (compactHeaderRowIndex < 0) throw new Error("지원하는 사업관리카드 열 제목을 찾지 못했습니다. 사업관리카드(현액/예산) 또는 세출예산집행현황목록인지 확인해주세요.");

  const primaryHeaders = matrix[compactHeaderRowIndex].map(normalize);
  const secondaryHeaders = (matrix[compactHeaderRowIndex + 1] ?? []).map(normalize);
  const secondaryHeaderNames = ["지출품의액", "지출품의금액", "원인행위액", "원인행위금액", "집행률", "지출결의액", "지출결의금액", "지급액"];
  const hasSecondaryHeader = secondaryHeaders.some((header) => secondaryHeaderNames.some((name) => header.startsWith(normalize(name))));
  const headers = primaryHeaders.map((header, index) => hasSecondaryHeader && secondaryHeaders[index] ? secondaryHeaders[index] : header);
  const exact = (name: string) => headers.findIndex((header) => header === normalize(name));
  const starts = (...names: string[]) => headers.findIndex((header) => names.some((name) => header.startsWith(normalize(name))));
  const includes = (name: string) => headers.findIndex((header) => header.includes(normalize(name)));
  const columns = {
    hierarchy: includes("세부사업/세부항목/원가통계비목"), calculation: exact("산출내역"), currentBudget: starts("예산현액"),
    requestAmount: starts("지출품의액", "지출품의금액"), obligation: starts("원인행위액", "원인행위금액"), budgetBalance: starts("예산잔액"),
    resolution: starts("지출결의액", "지출결의금액"), paid: starts("지급액"), settlementFund: starts("정산재원"),
  };
  const required = [columns.hierarchy, columns.calculation, columns.currentBudget, columns.obligation, columns.budgetBalance];
  if (required.some((index) => index < 0)) throw new Error("필수 열이 부족합니다. 사업관리카드(예산) 또는 세출예산집행현황목록인지 확인해주세요.");

  const titleText = normalize(`${firstSheetName} ${matrix.slice(0, compactHeaderRowIndex + 1).flat().join(" ")}`);
  const executionList = titleText.includes("세출예산집행현황목록");
  const sourceLabel = executionList ? "세출예산집행현황목록" : "사업관리카드(예산)";
  const hasPaymentDetail = columns.paid >= 0;
  const dataStartIndex = compactHeaderRowIndex + (hasSecondaryHeader ? 2 : 1);
  const leadingIndent = (value: unknown) => {
    const text = String(value ?? "").replace(/\u00a0/g, " ");
    const prefix = text.match(/^[ \t]*/)?.[0] ?? "";
    return prefix.replace(/\t/g, "    ").length;
  };

  const hierarchyIndents: number[] = [];
  matrix.slice(dataStartIndex).forEach((rawRow) => {
    const hierarchyText = String(cell(rawRow, columns.hierarchy) ?? "").replace(/\u00a0/g, " ");
    const label = hierarchyText.trim();
    const calculation = String(cell(rawRow, columns.calculation) ?? "").trim();
    if (!label || calculation || normalize(label).includes("합계")) return;
    hierarchyIndents.push(leadingIndent(hierarchyText));
  });
  const sortedIndents = [...new Set(hierarchyIndents)].sort((a, b) => a - b);
  const projectIndent = sortedIndents[0] ?? 0;
  const itemIndent = sortedIndents[1] ?? projectIndent + 1;

  let currentProject = "";
  let currentItem = "";
  const detailMap = new Map<string, BusinessCardRow>();
  matrix.slice(dataStartIndex).forEach((rawRow) => {
    const hierarchyText = String(cell(rawRow, columns.hierarchy) ?? "").replace(/\u00a0/g, " ");
    const label = hierarchyText.trim();
    const calculation = String(cell(rawRow, columns.calculation) ?? "").trim();
    if (!label && !calculation) return;
    if (normalize(label).includes("합계")) return;

    if (!calculation) {
      const indent = leadingIndent(hierarchyText);
      if (indent <= projectIndent) {
        currentProject = label;
        currentItem = "";
      } else if (indent <= itemIndent) {
        currentItem = label;
      }
      return;
    }

    if (!currentProject || !currentItem || !label) return;
    const costName = label;
    const id = [normalize(currentProject), normalize(currentItem), normalize(costName), normalize(calculation)].join("|");
    const currentBudget = numberValue(cell(rawRow, columns.currentBudget));
    const obligation = numberValue(cell(rawRow, columns.obligation));
    const paid = hasPaymentDetail ? numberValue(cell(rawRow, columns.paid)) : 0;
    const row: BusinessCardRow = {
      id, projectName: currentProject, itemName: currentItem, costName, calculation,
      originalBudget: 0, adjustment: 0, currentBudget,
      requestAmount: numberValue(cell(rawRow, columns.requestAmount)), obligation,
      budgetBalance: numberValue(cell(rawRow, columns.budgetBalance)),
      resolution: numberValue(cell(rawRow, columns.resolution)), paid,
      paymentBalance: hasPaymentDetail ? currentBudget - paid : 0,
      settlementFund: numberValue(cell(rawRow, columns.settlementFund)), generalFund: 0, managers: [],
    };
    mergeRow(detailMap, row);
  });

  const rows = [...detailMap.values()];
  if (!rows.length) throw new Error(`실제 산출내역 행을 찾지 못했습니다. ${sourceLabel} 원본 파일인지 확인해주세요.`);
  return { rows, meta: { fileName: file.name, year, rowCount: rows.length, hasManager: false, sourceLabel, hasPaymentDetail } };
}

async function parseWorkbook(file: File): Promise<{ rows: BudgetRow[]; meta: FileMeta }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("엑셀 시트를 찾을 수 없습니다.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: true, defval: null }) as unknown[][];
  const headerRowIndex = matrix.findIndex((row) => {
    const normalized = row.map(normalize);
    return normalized.includes("회계연도") && normalized.includes("세부사업") && normalized.some((cell) => cell.startsWith("예산현액"));
  });
  if (headerRowIndex < 0) throw new Error("102-2 파일의 열 제목을 찾지 못했습니다.");

  const headers = matrix[headerRowIndex].map(normalize);
  const exact = (name: string) => headers.findIndex((header) => header === normalize(name));
  const starts = (name: string) => headers.findIndex((header) => header.startsWith(normalize(name)));
  const columns = {
    year: exact("회계연도"), executionDate: exact("집행일자"), schoolCode: exact("학교코드"), schoolName: exact("학교명"),
    policyCode: exact("정책사업코드"), policyName: exact("정책사업"), unitCode: exact("단위사업코드"), unitName: exact("단위사업"),
    projectCode: exact("세부사업코드"), projectName: exact("세부사업"), itemCode: exact("세부항목코드"), itemName: exact("세부항목"),
    accountCode: exact("목코드"), accountName: exact("목명"), subAccountCode: exact("세목코드"), subAccountName: exact("세목명"),
    costCode: exact("원가통계비목코드"), costName: exact("원가통계비목명"), calculation: exact("산출내역"), budget: starts("예산현액(16)"),
    obligation: starts("원인행위금액(17)"), paid: starts("지출금액(18)"), carryover: starts("다음연도총이월액(22)"), available: starts("원인행위불용예상액"),
  };
  const required = [columns.year, columns.schoolName, columns.projectCode, columns.projectName, columns.itemCode, columns.itemName, columns.accountCode, columns.calculation, columns.budget, columns.obligation, columns.paid];
  if (required.some((index) => index < 0)) throw new Error("필수 열이 부족합니다. 102-2 파일인지 확인해주세요.");

  const cell = (row: unknown[], index: number) => (index >= 0 ? row[index] : null);
  const rows: BudgetRow[] = matrix.slice(headerRowIndex + 1).flatMap((row) => {
    const year = normalize(cell(row, columns.year));
    const projectName = String(cell(row, columns.projectName) ?? "").trim();
    if (!year || !projectName) return [];
    const budget = numberValue(cell(row, columns.budget));
    const obligation = numberValue(cell(row, columns.obligation));
    const paid = numberValue(cell(row, columns.paid));
    const carryover = numberValue(cell(row, columns.carryover));
    const calculation = String(cell(row, columns.calculation) ?? "").trim();
    const directAvailable = columns.available >= 0 ? numberValue(cell(row, columns.available)) : budget - obligation - carryover;
    return [{
      year, executionDate: normalize(cell(row, columns.executionDate)), schoolCode: normalize(cell(row, columns.schoolCode)), schoolName: String(cell(row, columns.schoolName) ?? "").trim(),
      policyCode: normalize(cell(row, columns.policyCode)), policyName: String(cell(row, columns.policyName) ?? "").trim(), unitCode: normalize(cell(row, columns.unitCode)), unitName: String(cell(row, columns.unitName) ?? "").trim(),
      projectCode: normalize(cell(row, columns.projectCode)), projectName, itemCode: normalize(cell(row, columns.itemCode)), itemName: String(cell(row, columns.itemName) ?? "").trim(),
      accountCode: normalize(cell(row, columns.accountCode)), accountName: String(cell(row, columns.accountName) ?? "").trim(), subAccountCode: normalize(cell(row, columns.subAccountCode)), subAccountName: String(cell(row, columns.subAccountName) ?? "").trim(),
      costCode: normalize(cell(row, columns.costCode)), costName: String(cell(row, columns.costName) ?? "").trim(), calculation, budget, obligation, paid, carryover, available: directAvailable, fundType: rowFundType(String(cell(row, columns.itemName) ?? "").trim(), calculation),
    }];
  });
  if (!rows.length) throw new Error("분석할 세출 데이터가 없습니다.");
  const first = rows[0];
  return { rows, meta: { fileName: file.name, year: first.year, executionDate: first.executionDate, schoolCode: first.schoolCode, schoolName: first.schoolName, rowCount: rows.length } };
}

async function parseRevenueWorkbook(file: File): Promise<{ rows: RevenueRow[]; meta: FileMeta }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("엑셀 시트를 찾을 수 없습니다.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: true, defval: null }) as unknown[][];
  const headerRowIndex = matrix.findIndex((row) => {
    const normalized = row.map(normalize);
    return normalized.includes("회계연도") && normalized.includes("원가통계비목명") && normalized.some((cell) => cell.startsWith("수납금액"));
  });
  if (headerRowIndex < 0) throw new Error("201 파일의 열 제목을 찾지 못했습니다. 목/원가목별 세입실적 파일인지 확인해주세요.");

  const headers = matrix[headerRowIndex].map(normalize);
  const exact = (name: string) => headers.findIndex((header) => header === normalize(name));
  const starts = (name: string) => headers.findIndex((header) => header.startsWith(normalize(name)));
  const columns = {
    year: exact("회계연도"), executionDate: exact("집행일자"), schoolCode: exact("학교코드"), schoolName: exact("학교명"),
    sectionCode: exact("장코드"), sectionName: exact("장"), categoryCode: exact("관코드"), categoryName: exact("관"),
    costCode: exact("원가통계비목코드"), costName: exact("원가통계비목명"), budget: starts("예산현액"),
    assessment: starts("징수결정액"), collected: starts("수납금액"), badDebt: starts("불납결손금액"), uncollected: starts("미수납액"),
  };
  const required = [columns.year, columns.executionDate, columns.schoolCode, columns.schoolName, columns.sectionName, columns.costCode, columns.costName, columns.budget, columns.assessment, columns.collected, columns.uncollected];
  if (required.some((index) => index < 0)) throw new Error("필수 열이 부족합니다. 201 목/원가목별 세입실적 파일인지 확인해주세요.");

  const cell = (row: unknown[], index: number) => (index >= 0 ? row[index] : null);
  const rawRows: RevenueRow[] = matrix.slice(headerRowIndex + 1).flatMap((row) => {
    const year = normalize(cell(row, columns.year));
    const costCode = normalize(cell(row, columns.costCode));
    if (!year || !costCode) return [];
    const budget = numberValue(cell(row, columns.budget));
    const assessment = numberValue(cell(row, columns.assessment));
    const collected = numberValue(cell(row, columns.collected));
    const badDebt = numberValue(cell(row, columns.badDebt));
    const uncollected = numberValue(cell(row, columns.uncollected));
    return [{
      year, executionDate: normalize(cell(row, columns.executionDate)), schoolCode: normalize(cell(row, columns.schoolCode)), schoolName: String(cell(row, columns.schoolName) ?? "").trim(),
      sectionCode: normalize(cell(row, columns.sectionCode)), sectionName: String(cell(row, columns.sectionName) ?? "기타수입").trim() || "기타수입",
      categoryCode: normalize(cell(row, columns.categoryCode)), categoryName: String(cell(row, columns.categoryName) ?? "").trim(),
      costCode, costName: String(cell(row, columns.costName) ?? "세입 항목").trim() || "세입 항목",
      budget, assessment, collected, badDebt, uncollected, budgetGap: collected - budget,
    }];
  });
  if (!rawRows.length) throw new Error("분석할 세입 데이터가 없습니다.");

  const grouped = new Map<string, RevenueRow>();
  rawRows.forEach((row) => {
    const current = grouped.get(row.costCode);
    if (!current) grouped.set(row.costCode, { ...row });
    else grouped.set(row.costCode, {
      ...current,
      budget: current.budget + row.budget,
      assessment: current.assessment + row.assessment,
      collected: current.collected + row.collected,
      badDebt: current.badDebt + row.badDebt,
      uncollected: current.uncollected + row.uncollected,
      budgetGap: current.budgetGap + row.budgetGap,
    });
  });
  const rows = [...grouped.values()];
  const mismatch = rows.find((row) => Math.abs(row.assessment - row.collected - row.badDebt - row.uncollected) >= 1);
  if (mismatch) throw new Error(`${mismatch.costName}의 징수결정액과 수납·미수납 금액이 일치하지 않습니다.`);
  const first = rows[0];
  return { rows, meta: { fileName: file.name, year: first.year, executionDate: first.executionDate, schoolCode: first.schoolCode, schoolName: first.schoolName, rowCount: rows.length } };
}

function groupProjects(rows: BudgetRow[]): BudgetGroup[] {
  const map = new Map<string, BudgetGroup>();
  rows.forEach((row) => {
    const id = row.projectCode || `${row.policyName}|${row.unitName}|${row.projectName}`;
    const current = map.get(id) ?? { id, policyName: row.policyName, unitName: row.unitName, projectName: row.projectName, budget: 0, obligation: 0, paid: 0, carryover: 0, available: 0, pending: 0, rate: 0, fundTypes: new Set<BudgetRow["fundType"]>(), rows: [] };
    current.budget += row.budget; current.obligation += row.obligation; current.paid += row.paid; current.carryover += row.carryover; current.available += row.available; current.fundTypes.add(row.fundType); current.rows.push(row); map.set(id, current);
  });
  return [...map.values()].map((group) => ({ ...group, pending: group.obligation - group.paid, rate: group.budget ? (group.obligation / group.budget) * 100 : 0 }));
}

function schoolHierarchyId(row: BudgetRow, level: SchoolHierarchyLevel) {
  if (level === "policy") return row.policyCode || normalize(row.policyName) || "policy-none";
  if (level === "unit") return [row.policyCode || normalize(row.policyName), row.unitCode || normalize(row.unitName)].join("|");
  if (level === "project") return [row.policyCode || normalize(row.policyName), row.unitCode || normalize(row.unitName), row.projectCode || normalize(row.projectName)].join("|");
  return [row.policyCode || normalize(row.policyName), row.unitCode || normalize(row.unitName), row.projectCode || normalize(row.projectName), row.itemCode || normalize(row.itemName)].join("|");
}

function schoolHierarchyLabel(row: BudgetRow, level: SchoolHierarchyLevel) {
  if (level === "policy") return row.policyName || "정책사업 없음";
  if (level === "unit") return row.unitName || "단위사업 없음";
  if (level === "project") return row.projectName || "세부사업 없음";
  return row.itemName || "세부항목 없음";
}

function schoolHierarchyParentLabel(row: BudgetRow, level: SchoolHierarchyLevel) {
  if (level === "policy") return "학교 전체";
  if (level === "unit") return row.policyName || "정책사업 없음";
  if (level === "project") return [row.policyName, row.unitName].filter(Boolean).join(" · ");
  return [row.unitName, row.projectName].filter(Boolean).join(" · ");
}

function groupSchoolRows(rows: BudgetRow[], level: SchoolHierarchyLevel): SchoolAnalysisGroup[] {
  const map = new Map<string, SchoolAnalysisGroup>();
  rows.forEach((row) => {
    const id = schoolHierarchyId(row, level);
    const current = map.get(id) ?? {
      id,
      level,
      label: schoolHierarchyLabel(row, level),
      parentLabel: schoolHierarchyParentLabel(row, level),
      budget: 0,
      obligation: 0,
      paid: 0,
      carryover: 0,
      pending: 0,
      uncommitted: 0,
      obligationRate: 0,
      spendingRate: 0,
      rows: [],
    };
    current.budget += row.budget;
    current.obligation += row.obligation;
    current.paid += row.paid;
    current.carryover += row.carryover;
    current.rows.push(row);
    map.set(id, current);
  });
  return [...map.values()].map((group) => ({
    ...group,
    pending: group.obligation - group.paid,
    uncommitted: group.budget - group.obligation,
    obligationRate: group.budget ? (group.obligation / group.budget) * 100 : 0,
    spendingRate: group.budget ? (group.paid / group.budget) * 100 : 0,
  }));
}

function sortSchoolGroups(groups: SchoolAnalysisGroup[], sort: SchoolSort) {
  const result = [...groups];
  if (sort === "budget-desc") return result.sort((a, b) => b.budget - a.budget);
  if (sort === "budget-asc") return result.sort((a, b) => a.budget - b.budget);
  if (sort === "obligation-desc") return result.sort((a, b) => b.obligation - a.obligation);
  if (sort === "obligation-asc") return result.sort((a, b) => a.obligation - b.obligation);
  if (sort === "obligation-rate-desc") return result.sort((a, b) => b.obligationRate - a.obligationRate);
  if (sort === "obligation-rate-asc") return result.sort((a, b) => a.obligationRate - b.obligationRate);
  if (sort === "paid-desc") return result.sort((a, b) => b.paid - a.paid);
  if (sort === "paid-asc") return result.sort((a, b) => a.paid - b.paid);
  if (sort === "pending-desc") return result.sort((a, b) => b.pending - a.pending);
  if (sort === "pending-asc") return result.sort((a, b) => a.pending - b.pending);
  if (sort === "uncommitted-desc") return result.sort((a, b) => b.uncommitted - a.uncommitted);
  if (sort === "uncommitted-asc") return result.sort((a, b) => a.uncommitted - b.uncommitted);
  return result.sort((a, b) => compareText(a.label, b.label));
}

function groupPromotions(rows: BudgetRow[]): PromotionGroup[] {
  const map = new Map<string, PromotionGroup>();
  rows.filter((row) => row.accountCode === "B20").forEach((row) => {
    const id = [row.projectCode, row.itemCode, row.accountCode].join("|");
    const current = map.get(id) ?? { id, projectName: row.projectName, itemName: row.itemName || row.projectName, budget: 0, obligation: 0, paid: 0, available: 0, rate: 0, rows: [] };
    current.budget += row.budget; current.obligation += row.obligation; current.paid += row.paid; current.available += row.available; current.rows.push(row); map.set(id, current);
  });
  return [...map.values()]
    .map((group) => ({ ...group, rate: group.budget ? (group.obligation / group.budget) * 100 : 0 }))
    .sort((a, b) => {
      const aOverruns = a.rows.filter((row) => row.available < 0).length;
      const bOverruns = b.rows.filter((row) => row.available < 0).length;
      if (aOverruns !== bOverruns) return bOverruns - aOverruns;
      return b.available - a.available;
    });
}

function promotionDetailId(row: BudgetRow) {
  return [row.projectCode, row.itemCode, row.accountCode, row.subAccountCode, row.costCode, normalize(row.calculation || row.costName)].join("|");
}

function promotionDetails(group: PromotionGroup): PromotionDetail[] {
  const map = new Map<string, PromotionDetail>();
  group.rows.forEach((row) => {
    const id = promotionDetailId(row);
    const current = map.get(id) ?? {
      id,
      groupId: group.id,
      projectName: group.projectName,
      itemName: group.itemName,
      costName: row.costName,
      calculation: row.calculation || row.costName || "산출내역 없음",
      budget: 0,
      obligation: 0,
      paid: 0,
      available: 0,
    };
    current.budget += row.budget;
    current.obligation += row.obligation;
    current.paid += row.paid;
    current.available += row.available;
    map.set(id, current);
  });
  return [...map.values()].sort((a, b) => Number(a.available >= 0) - Number(b.available >= 0) || a.available - b.available);
}

function groupItemRows(rows: BudgetRow[]) {
  const map = new Map<string, { name: string; budget: number; obligation: number; paid: number; available: number; calculations: string[]; overrunRows: BudgetRow[] }>();
  rows.forEach((row) => {
    const id = `${row.itemCode}|${row.itemName}`;
    const current = map.get(id) ?? { name: row.itemName || "세부항목 없음", budget: 0, obligation: 0, paid: 0, available: 0, calculations: [], overrunRows: [] };
    current.budget += row.budget; current.obligation += row.obligation; current.paid += row.paid; current.available += row.available;
    if (row.calculation && !current.calculations.includes(row.calculation)) current.calculations.push(row.calculation);
    if (row.available < 0) current.overrunRows.push(row);
    map.set(id, current);
  });
  return [...map.values()].sort((a, b) => b.overrunRows.length - a.overrunRows.length || b.budget - a.budget);
}

function spendingDetailId(row: BudgetRow) {
  return [row.projectCode, row.itemCode, row.accountCode, row.subAccountCode, row.costCode, normalize(row.calculation || row.costName)].join("|");
}

function groupSpendingDetails(rows: BudgetRow[]): SpendingDetail[] {
  const map = new Map<string, SpendingDetail>();
  rows.filter((row) => row.accountCode !== "B20").forEach((row) => {
    const id = spendingDetailId(row);
    const current = map.get(id) ?? {
      id,
      projectCode: row.projectCode,
      projectName: row.projectName,
      itemName: row.itemName || row.projectName,
      costName: row.costName,
      calculation: row.calculation || row.costName || "산출내역 없음",
      available: 0,
    };
    current.available += row.available;
    map.set(id, current);
  });
  return [...map.values()].filter((detail) => detail.available > 1_000).sort((a, b) => b.available - a.available);
}

function effectiveDetailSpending(detail: SpendingDetail, plan?: DetailSpendingPlan) {
  if (!plan || Math.abs(plan.reviewedBalance - detail.available) >= 1 || plan.mode === "full") return detail.available;
  if (plan.mode === "none") return 0;
  return Math.min(detail.available, Math.max(0, plan.amount));
}

function statusFor(group: BudgetGroup) {
  const overrunCount = group.rows.filter((row) => row.available < 0).length;
  if (overrunCount) return { label: `초과 ${overrunCount}건`, tone: "danger" };
  if (group.budget <= 0) return { label: "예산 없음", tone: "muted" };
  if (group.available < 0) return { label: "예산 초과", tone: "danger" };
  if (group.available === 0) return { label: "집행 완료", tone: "complete" };
  if (group.available / group.budget <= 0.1) return { label: "잔액 확인", tone: "warning" };
  if (group.obligation === 0) return { label: "미집행", tone: "attention" };
  if (group.rate < 30) return { label: "계획 확인", tone: "attention" };
  if (group.pending > 0) return { label: "지급 진행 중", tone: "progress" };
  return { label: "정상", tone: "normal" };
}
function legacyPlanStorageKey(meta: FileMeta, group: PromotionGroup) {
  const rowIdentity = group.rows.map((row) => [row.costCode, row.calculation].join("|")).sort().join("~");
  return [meta.year, meta.schoolCode, group.id, rowIdentity].join("::");
}
function planStorageKey(meta: FileMeta, detail: PromotionDetail) {
  return [meta.year, meta.schoolCode, "detail", detail.id].join("::");
}
function promotionPlansForGroup(meta: FileMeta, group: PromotionGroup, plans: Record<string, Plan>) {
  const details = promotionDetails(group);
  const detailPlans = details.map((detail) => plans[planStorageKey(meta, detail)]).filter((plan): plan is Plan => Boolean(plan));
  if (detailPlans.length) return detailPlans;
  const legacy = plans[legacyPlanStorageKey(meta, group)];
  return legacy ? [legacy] : [];
}
function readPlans() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, Plan>; } catch { return {}; } }
function sum(rows: BudgetRow[], key: "budget" | "obligation" | "paid" | "carryover" | "available") { return rows.reduce((total, row) => total + row[key], 0); }
function closingStorageKey(meta: FileMeta) { return `${CLOSING_STORAGE_KEY}::${meta.schoolCode}::${meta.year}`; }
function readClosingInputs(meta: FileMeta) {
  try { return JSON.parse(localStorage.getItem(closingStorageKey(meta)) ?? "null") as ClosingInputs | null; } catch { return null; }
}
function defaultClosingInputs(revenueRows: RevenueRow[], totals: { carryover: number }): ClosingInputs {
  return {
    schemaVersion: 2,
    additionalReceipts: Object.fromEntries(revenueRows.map((row) => [row.costCode, Math.max(0, row.budget - row.collected)])),
    extraFutureSpending: 0,
    legacyFutureSpending: 0,
    legacyDecision: "none",
    detailSpendingPlans: {},
    nextCarryover: Math.max(0, totals.carryover),
    returns: 0,
    otherDeductions: 0,
    transferReturns: {},
    memo: "",
  };
}

function mergeClosingInputs(saved: ClosingInputs | null, defaults: ClosingInputs): ClosingInputs {
  if (!saved) return defaults;
  const isCurrent = saved.schemaVersion === 2;
  const legacyAmount = Math.max(0, Number(saved.otherFutureSpending) || 0);
  return {
    ...defaults,
    ...saved,
    schemaVersion: 2,
    additionalReceipts: { ...defaults.additionalReceipts, ...(saved.additionalReceipts ?? {}) },
    transferReturns: saved.transferReturns ?? {},
    extraFutureSpending: isCurrent ? (saved.extraFutureSpending ?? 0) : 0,
    legacyFutureSpending: isCurrent ? (saved.legacyFutureSpending ?? 0) : legacyAmount,
    legacyDecision: isCurrent ? (saved.legacyDecision ?? "none") : (legacyAmount > 0 ? "pending" : "none"),
    detailSpendingPlans: isCurrent ? (saved.detailSpendingPlans ?? {}) : {},
  };
}

export default function Home() {
  const [mainView, setMainView] = useState<MainView>("mine");
  const [businessRows, setBusinessRows] = useState<BusinessCardRow[]>([]);
  const [businessMeta, setBusinessMeta] = useState<BusinessCardMeta | null>(null);
  const [businessManager, setBusinessManager] = useState("all");
  const [businessPlans, setBusinessPlans] = useState<Record<string, number>>({});
  const [businessDragging, setBusinessDragging] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessError, setBusinessError] = useState("");
  const businessFileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [tab, setTab] = useState<ViewTab>("overview");
  const [fundFilter, setFundFilter] = useState<FundFilter>("all");
  const [attention, setAttention] = useState<AttentionKind>("all");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);
  const [planAmount, setPlanAmount] = useState("");
  const [planMonth, setPlanMonth] = useState("미정");
  const [planMemo, setPlanMemo] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolDragging, setSchoolDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [revenueMeta, setRevenueMeta] = useState<FileMeta | null>(null);
  const [closingInputs, setClosingInputs] = useState<ClosingInputs | null>(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const [closingError, setClosingError] = useState("");
  const [closingDragging, setClosingDragging] = useState(false);
  const revenueFileInputRef = useRef<HTMLInputElement>(null);

  const businessManagers = useMemo(() => [...new Set(businessRows.flatMap((row) => row.managers))].sort((a, b) => a.localeCompare(b, "ko")), [businessRows]);
  const visibleBusinessRows = useMemo(() => businessManager === "all" ? businessRows : businessRows.filter((row) => row.managers.includes(businessManager)), [businessRows, businessManager]);
  const businessTotals = useMemo(() => visibleBusinessRows.reduce((totals, row) => ({
    currentBudget: totals.currentBudget + row.currentBudget,
    obligation: totals.obligation + row.obligation,
    paid: totals.paid + row.paid,
    budgetBalance: totals.budgetBalance + row.budgetBalance,
    paymentBalance: totals.paymentBalance + row.paymentBalance,
  }), { currentBudget: 0, obligation: 0, paid: 0, budgetBalance: 0, paymentBalance: 0 }), [visibleBusinessRows]);

  const filteredRows = useMemo(() => fundFilter === "all" ? rows : rows.filter((row) => row.fundType === fundFilter), [rows, fundFilter]);
  const totals = useMemo(() => ({ budget: sum(filteredRows, "budget"), obligation: sum(filteredRows, "obligation"), paid: sum(filteredRows, "paid"), carryover: sum(filteredRows, "carryover"), available: sum(filteredRows, "available") }), [filteredRows]);
  const allTotals = useMemo(() => ({ budget: sum(rows, "budget"), obligation: sum(rows, "obligation"), paid: sum(rows, "paid"), carryover: sum(rows, "carryover"), available: sum(rows, "available") }), [rows]);
  const pending = totals.obligation - totals.paid;
  const obligationRate = totals.budget ? (totals.obligation / totals.budget) * 100 : 0;
  const paymentRate = totals.obligation ? (totals.paid / totals.obligation) * 100 : 0;
  const projectGroups = useMemo(() => groupProjects(filteredRows).filter((group) => group.budget !== 0 || group.obligation !== 0 || group.paid !== 0), [filteredRows]);
  const topAvailableProjects = useMemo(() => [...projectGroups].filter((group) => group.available > 0).sort((a, b) => b.available - a.available).slice(0, 10), [projectGroups]);
  const visibleProjects = useMemo(() => {
    let result = [...projectGroups];
    if (attention === "overrun") result = result.filter((group) => group.rows.some((row) => row.available < 0)).sort((a, b) => b.rows.filter((row) => row.available < 0).length - a.rows.filter((row) => row.available < 0).length);
    if (attention === "unspent") result = result.filter((group) => group.budget > 0 && group.obligation === 0);
    if (attention === "low") result = result.filter((group) => group.budget > 0 && group.obligation > 0 && group.rate < 30);
    if (attention === "large") result = result.sort((a, b) => b.available - a.available).slice(0, 10);
    if (attention === "nearly") result = result.filter((group) => group.budget > 0 && group.available > 0 && group.available / group.budget <= 0.1);
    if (attention === "pending") result = result.filter((group) => group.pending > 0);
    if (attention === "all") result.sort((a, b) => b.available - a.available);
    return result;
  }, [projectGroups, attention]);
  const attentionCounts = useMemo(() => ({ overrun: filteredRows.filter((row) => row.available < 0).length, unspent: projectGroups.filter((group) => group.budget > 0 && group.obligation === 0).length, low: projectGroups.filter((group) => group.budget > 0 && group.obligation > 0 && group.rate < 30).length, nearly: projectGroups.filter((group) => group.budget > 0 && group.available > 0 && group.available / group.budget <= 0.1).length, pending: projectGroups.filter((group) => group.pending > 0).length }), [filteredRows, projectGroups]);
  const promotionGroups = useMemo(() => groupPromotions(filteredRows), [filteredRows]);
  const allPromotionGroups = useMemo(() => groupPromotions(rows), [rows]);
  const promotionTotals = useMemo(() => ({ budget: promotionGroups.reduce((total, group) => total + group.budget, 0), obligation: promotionGroups.reduce((total, group) => total + group.obligation, 0), paid: promotionGroups.reduce((total, group) => total + group.paid, 0), available: promotionGroups.reduce((total, group) => total + group.available, 0) }), [promotionGroups]);
  const allPromotionDetails = useMemo(() => allPromotionGroups.flatMap(promotionDetails), [allPromotionGroups]);
  const activePromotionPlans = useMemo(() => meta ? allPromotionGroups.flatMap((group) => promotionPlansForGroup(meta, group, plans)) : [], [meta, allPromotionGroups, plans]);
  const visiblePromotionPlans = useMemo(() => meta ? promotionGroups.flatMap((group) => promotionPlansForGroup(meta, group, plans)) : [], [meta, promotionGroups, plans]);
  const plannedTotal = useMemo(() => activePromotionPlans.reduce((total, plan) => total + (Number(plan.amount) || 0), 0), [activePromotionPlans]);
  const visiblePlannedTotal = useMemo(() => visiblePromotionPlans.reduce((total, plan) => total + (Number(plan.amount) || 0), 0), [visiblePromotionPlans]);
  const plannedYearEndTotal = useMemo(() => activePromotionPlans.filter((plan) => plan.month === "12월" || plan.month === "회계연도 말").reduce((total, plan) => total + (Number(plan.amount) || 0), 0), [activePromotionPlans]);
  const plannedDetailCount = useMemo(() => activePromotionPlans.filter((plan) => plan.amount > 0).length, [activePromotionPlans]);
  const promotionRecheckCount = useMemo(() => meta ? allPromotionDetails.filter((detail) => {
    const plan = plans[planStorageKey(meta, detail)];
    return Boolean(plan && plan.reviewedBalance !== undefined && Math.abs(plan.reviewedBalance - detail.available) >= 1);
  }).length + allPromotionGroups.filter((group) => promotionDetails(group).length > 1 && Boolean(plans[legacyPlanStorageKey(meta, group)]) && !promotionDetails(group).some((detail) => plans[planStorageKey(meta, detail)])).length : 0, [meta, allPromotionDetails, allPromotionGroups, plans]);
  const promotionForecast = promotionTotals.available - visiblePlannedTotal;
  const selectedPromotion = allPromotionDetails.find((detail) => detail.id === selectedPromotionId) ?? null;
  const loadSelectedPlan = (detail: PromotionDetail, openPanel = true) => {
    if (!meta) return;
    setSelectedPromotionId(detail.id);
    const existing = plans[planStorageKey(meta, detail)];
    setPlanAmount(existing?.amount ? existing.amount.toLocaleString("ko-KR") : ""); setPlanMonth(existing?.month ?? "미정"); setPlanMemo(existing?.memo ?? "");
    if (openPanel) setPlanPanelOpen(true);
  };
  const handleBusinessFile = async (file?: File) => {
    if (!file) return;
    const previousFileName = businessMeta?.fileName ?? "";
    setBusinessLoading(true); setBusinessError("");
    try {
      const result = await parseBusinessCard(file);
      setBusinessRows(result.rows);
      setBusinessMeta(result.meta);
      setBusinessManager("all");
      setBusinessPlans(readBusinessPlans());
      setMainView("mine");
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : "사업관리카드를 분석하지 못했습니다.";
      setBusinessError(previousFileName
        ? `파일을 변경하지 못했습니다.\n${detail}\n기존 “${previousFileName}” 자료를 계속 표시하고 있습니다.`
        : detail);
    } finally {
      setBusinessLoading(false);
      if (businessFileInputRef.current) businessFileInputRef.current.value = "";
    }
  };
  const onBusinessDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setBusinessDragging(false); handleBusinessFile(event.dataTransfer.files?.[0]);
  };
  const updateBusinessPlan = (row: BusinessCardRow, rawValue: string) => {
    if (!businessMeta) return;
    const amount = Math.max(0, numberValue(rawValue.replace(/[^0-9]/g, "")));
    const key = businessPlanKey(businessMeta, row);
    const next = { ...businessPlans };
    if (amount) next[key] = amount; else delete next[key];
    setBusinessPlans(next);
    localStorage.setItem(BUSINESS_PLAN_STORAGE_KEY, JSON.stringify(next));
  };
  const handleFile = async (file?: File) => {
    if (!file) return;
    const previousFileName = meta?.fileName ?? "";
    setLoading(true); setError("");
    try {
      const result = await parseWorkbook(file);
      const parsedPromotionGroups = groupPromotions(result.rows);
      const stored = readPlans();
      const restored: Record<string, Plan> = {};
      parsedPromotionGroups.forEach((group) => {
        const details = promotionDetails(group);
        details.forEach((detail) => { const key = planStorageKey(result.meta, detail); if (stored[key]) restored[key] = stored[key]; });
        const legacyKey = legacyPlanStorageKey(result.meta, group);
        const legacy = stored[legacyKey];
        if (legacy && details.length === 1 && !restored[planStorageKey(result.meta, details[0])]) {
          restored[planStorageKey(result.meta, details[0])] = { ...legacy, reviewedBalance: details[0].available };
        } else if (legacy) restored[legacyKey] = legacy;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, ...restored }));
      const firstPromotion = parsedPromotionGroups.flatMap(promotionDetails)[0];
      const firstPlan = firstPromotion ? restored[planStorageKey(result.meta, firstPromotion)] : undefined;
      setRows(result.rows); setMeta(result.meta); setPlans(restored); setSelectedPromotionId(firstPromotion?.id ?? null);
      setRevenueRows([]); setRevenueMeta(null); setClosingInputs(null); setClosingError("");
      setPlanAmount(firstPlan?.amount ? firstPlan.amount.toLocaleString("ko-KR") : ""); setPlanMonth(firstPlan?.month ?? "미정"); setPlanMemo(firstPlan?.memo ?? "");
      setTab("overview"); setFundFilter("all"); setAttention("all"); setExpandedProjects(new Set());
      setMainView("school");
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : "파일을 분석하지 못했습니다.";
      setError(previousFileName
        ? `파일을 변경하지 못했습니다.\n${detail}\n기존 “${previousFileName}” 자료를 계속 표시하고 있습니다.`
        : detail);
    }
    finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => handleFile(event.target.files?.[0]);
  const onSchoolDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setSchoolDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };
  const toggleProject = (id: string) => setExpandedProjects((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const focusProject = (id: string) => {
    setAttention("all");
    setExpandedProjects((current) => new Set(current).add(id));
    window.setTimeout(() => document.querySelector<HTMLElement>(`[data-project-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };
  const savePlan = () => {
    if (!meta || !selectedPromotion) return;
    const amount = numberValue(planAmount);
    if (amount > 0 && selectedPromotion.available < 0 && !window.confirm(`이미 ${formatWon(Math.abs(selectedPromotion.available))} 초과된 산출내역입니다. ${formatWon(amount)}을 추가 반영하면 예상 초과액은 ${formatWon(Math.abs(selectedPromotion.available - amount))}입니다. 그래도 저장할까요?`)) return;
    if (selectedPromotion.available >= 0 && amount > selectedPromotion.available && !window.confirm(`현재 신규 집행 가능액보다 ${formatWon(amount - selectedPromotion.available)} 큰 계획입니다. 그래도 저장할까요?`)) return;
    const key = planStorageKey(meta, selectedPromotion);
    const nextPlan: Plan = { amount, month: planMonth, memo: planMemo.trim(), updatedAt: new Date().toISOString(), reviewedBalance: selectedPromotion.available };
    const allStored = readPlans(); allStored[key] = nextPlan; localStorage.setItem(STORAGE_KEY, JSON.stringify(allStored)); setPlans((current) => ({ ...current, [key]: nextPlan })); setPlanPanelOpen(false);
  };
  const removePlan = () => {
    if (!meta || !selectedPromotion || !window.confirm("이 항목의 집행계획을 삭제할까요?")) return;
    const key = planStorageKey(meta, selectedPromotion);
    const allStored = readPlans();
    delete allStored[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allStored));
    setPlans((current) => { const next = { ...current }; delete next[key]; return next; });
    setPlanAmount(""); setPlanMonth("미정"); setPlanMemo(""); setPlanPanelOpen(false);
  };
  const changePlanAmount = (value: string) => { const digits = value.replace(/[^0-9]/g, ""); setPlanAmount(digits ? Number(digits).toLocaleString("ko-KR") : ""); };
  const currentPlanAmount = numberValue(planAmount);
  const selectedForecast = selectedPromotion ? selectedPromotion.available - currentPlanAmount : 0;

  useEffect(() => {
    if (!revenueMeta || !closingInputs) return;
    localStorage.setItem(closingStorageKey(revenueMeta), JSON.stringify(closingInputs));
  }, [closingInputs, revenueMeta]);

  const handleRevenueFile = async (file?: File) => {
    if (!file || !meta) return;
    const previousFileName = revenueMeta?.fileName ?? "";
    setClosingLoading(true); setClosingError("");
    try {
      const result = await parseRevenueWorkbook(file);
      if (result.meta.schoolCode !== meta.schoolCode || result.meta.year !== meta.year) throw new Error("서로 다른 학교 또는 회계연도의 파일입니다. 같은 학교·같은 회계연도 파일을 올려주세요.");
      if (result.meta.executionDate !== meta.executionDate) throw new Error("두 파일의 기준일이 다릅니다. 같은 날짜에 내려받은 파일을 사용해주세요.");
      const revenueBudget = result.rows.reduce((total, row) => total + row.budget, 0);
      if (Math.abs(revenueBudget - allTotals.budget) >= 1) throw new Error(`세입·세출 예산현액이 일치하지 않습니다. 세입 ${formatWon(revenueBudget)}, 세출 ${formatWon(allTotals.budget)}입니다.`);
      const saved = readClosingInputs(result.meta);
      setRevenueRows(result.rows);
      setRevenueMeta(result.meta);
      const defaults = defaultClosingInputs(result.rows, allTotals);
      setClosingInputs(mergeClosingInputs(saved, defaults));
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : "201 파일을 분석하지 못했습니다.";
      setClosingError(previousFileName
        ? `파일을 변경하지 못했습니다.\n${detail}\n기존 “${previousFileName}” 자료를 계속 표시하고 있습니다.`
        : detail);
    } finally {
      setClosingLoading(false);
      if (revenueFileInputRef.current) revenueFileInputRef.current.value = "";
    }
  };
  const onRevenueDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setClosingDragging(false);
    handleRevenueFile(event.dataTransfer.files?.[0]);
  };
  const changeClosingAmount = (field: ClosingAmountField, value: string) => {
    const amount = Math.max(0, numberValue(value.replace(/[^0-9]/g, "")));
    setClosingInputs((current) => current ? { ...current, [field]: amount } : current);
  };
  const changeAdditionalReceipt = (costCode: string, value: string) => {
    const amount = Math.max(0, numberValue(value.replace(/[^0-9]/g, "")));
    setClosingInputs((current) => current ? { ...current, additionalReceipts: { ...current.additionalReceipts, [costCode]: amount } } : current);
  };
  const changeTransferReturn = (costCode: string, patch: Partial<TransferReturnPlan>) => {
    setClosingInputs((current) => {
      if (!current) return current;
      const existing = current.transferReturns[costCode] ?? { amount: 0, schedule: "회계연도 말", memo: "", includedInSpending: false, updatedAt: "" };
      return { ...current, transferReturns: { ...current.transferReturns, [costCode]: { ...existing, ...patch, updatedAt: new Date().toISOString() } } };
    });
  };
  const removeTransferReturn = (costCode: string) => {
    setClosingInputs((current) => {
      if (!current) return current;
      const transferReturns = { ...current.transferReturns };
      delete transferReturns[costCode];
      return { ...current, transferReturns };
    });
  };
  const changeDetailSpendingPlan = (id: string, mode: DetailSpendingMode, amount: number, balance: number) => {
    const safeAmount = mode === "full" ? balance : mode === "none" ? 0 : Math.max(0, Math.min(balance, amount));
    setClosingInputs((current) => current ? { ...current, detailSpendingPlans: { ...current.detailSpendingPlans, [id]: { mode, amount: safeAmount, reviewedBalance: balance, updatedAt: new Date().toISOString() } } } : current);
  };
  const clearDetailSpendingPlan = (id: string) => {
    setClosingInputs((current) => {
      if (!current) return current;
      const detailSpendingPlans = { ...current.detailSpendingPlans };
      delete detailSpendingPlans[id];
      return { ...current, detailSpendingPlans };
    });
  };
  const resetDetailSpendingPlans = () => {
    if (!window.confirm("입력한 산출내역별 집행계획을 모두 지우고 전액 집행 가정으로 되돌릴까요?")) return;
    setClosingInputs((current) => current ? { ...current, detailSpendingPlans: {} } : current);
  };
  const setLegacyDecision = (decision: "keep" | "discard") => {
    setClosingInputs((current) => current ? { ...current, legacyDecision: decision } : current);
  };
  const resetClosing = () => {
    if (!revenueMeta || !window.confirm("입력한 예측값을 지우고 예산 기준으로 초기화할까요?")) return;
    setClosingInputs(defaultClosingInputs(revenueRows, allTotals));
  };

  const resetLoadedData = () => {
    // 불러온 파일/화면 상태만 비웁니다. localStorage의 집행계획·결산예측 입력값은 삭제하지 않습니다.
    setBusinessRows([]);
    setBusinessMeta(null);
    setBusinessManager("all");
    setBusinessPlans({});
    setBusinessDragging(false);
    setBusinessLoading(false);
    setBusinessError("");

    setRows([]);
    setMeta(null);
    setTab("overview");
    setFundFilter("all");
    setAttention("all");
    setExpandedProjects(new Set());
    setPlans({});
    setSelectedPromotionId(null);
    setPlanPanelOpen(false);
    setPlanAmount("");
    setPlanMonth("미정");
    setPlanMemo("");
    setLoading(false);
    setError("");
    setSchoolDragging(false);

    setRevenueRows([]);
    setRevenueMeta(null);
    setClosingInputs(null);
    setClosingLoading(false);
    setClosingError("");
    setClosingDragging(false);

    if (businessFileInputRef.current) businessFileInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (revenueFileInputRef.current) revenueFileInputRef.current.value = "";

    setMainView("mine");
    setResetConfirmOpen(false);
  };

  const resetAllStoredInputs = () => {
    // 이 앱이 사용하는 저장값만 선택적으로 삭제합니다. 다른 localStorage 값은 건드리지 않습니다.
    localStorage.removeItem(BUSINESS_PLAN_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);

    const closingKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(`${CLOSING_STORAGE_KEY}::`)) closingKeys.push(key);
    }
    closingKeys.forEach((key) => localStorage.removeItem(key));

    resetLoadedData();
    setBusinessPlans({});
    setPlans({});
    setClosingInputs(null);
  };

  return (
    <main className="app-shell">
      <input ref={businessFileInputRef} className="sr-only" type="file" accept=".xlsx,.xls" onChange={(event) => handleBusinessFile(event.target.files?.[0])} aria-label="사업관리카드 엑셀 파일 선택" />
      <input ref={fileInputRef} className="sr-only" type="file" accept=".xlsx,.xls" onChange={onFileChange} aria-label="102-2 엑셀 파일 선택" />
      <input ref={revenueFileInputRef} className="sr-only" type="file" accept=".xlsx,.xls" onChange={(event) => handleRevenueFile(event.target.files?.[0])} aria-label="201 세입실적 엑셀 파일 선택" />
      <header className={`topbar ${businessMeta || meta ? "topbar-workspace" : "topbar-landing"}`}>
        <div className="topbar-inner">
          <div className="brand-block"><div className="brand-mark"><BarChart3 size={19} /></div><div><div className="brand-title-line"><strong>학교회계 예산현황판</strong><em className="version-badge">{APP_VERSION}</em></div><span>학돌랩</span></div></div>
          <div className="top-actions"><details className="privacy-popover"><summary><LockKeyhole size={15} />서버 전송 없음</summary><div><strong>파일은 이 브라우저에서만 분석됩니다.</strong><p>불러온 엑셀 파일은 서버로 전송하거나 저장하지 않습니다.</p><p>직접 입력한 집행계획·결산예측 값은 재접속을 위해 현재 브라우저 저장공간에 보관될 수 있습니다.</p></div></details>{(businessMeta || meta) && <><button className="button compact data-change-button" onClick={() => (mainView === "school" ? fileInputRef : businessFileInputRef).current?.click()}><RefreshCw size={16} />자료 변경</button><button className="button compact data-reset-button" onClick={() => setResetConfirmOpen(true)}><Trash2 size={15} />자료 비우기</button></>}<button className="button ghost compact help-button" onClick={() => setHelpOpen(true)}><HelpCircle size={17} />도움말</button></div>
        </div>
      </header>

      {!businessMeta && !meta ? (
        <section className="upload-page launch-home">
          <div className="landing-hero-panel">
            <div className="upload-intro"><span className="eyebrow">내 사업 예산 보기</span><h1>내 사업 예산,<br />지금 얼마나 남았을까?</h1><p>사업관리카드(현액 또는 예산) 하나만 불러오면 현재 집행현황과 앞으로 사용할 수 있는 예산을 바로 정리해드려요.</p><div className="landing-flow" aria-label="예산현황판 이용 순서"><span><b>1</b>사업관리카드 업로드</span><i>→</i><span><b>2</b>자동 분석</span><i>→</i><span><b>3</b>잔액 확인</span></div><BusinessFileRouteGuide compact /></div>
            <div className={`drop-zone ${businessDragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setBusinessDragging(true); }} onDragLeave={() => setBusinessDragging(false)} onDrop={onBusinessDrop}>
              <span className="drop-kicker">가장 먼저</span><div className="drop-icon"><UploadCloud size={28} /></div><h2>사업관리카드 불러오기</h2><p>파일을 끌어놓거나 아래 버튼으로 선택하세요.</p>
              <button className="button primary landing-upload-button" onClick={() => businessFileInputRef.current?.click()} disabled={businessLoading}><FileSpreadsheet size={18} />{businessLoading ? "분석 중..." : "파일 선택"}</button><span className="file-hint">.xlsx · .xls · 현액/예산/집행현황 자동 판별</span><span className="browser-security-note"><LockKeyhole size={13} />파일은 이 브라우저에서만 분석됩니다.</span>
              {businessError && <div className="error-message" role="alert"><AlertCircle size={17} />{businessError}</div>}
            </div>
          </div>
          <div className={`school-upload-teaser school-drop-target ${schoolDragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setSchoolDragging(true); }} onDragLeave={() => setSchoolDragging(false)} onDrop={onSchoolDrop}><div><span className="school-teaser-icon"><Building2 size={19} /></span><span><em>선택 기능 · 102-2</em><strong>{schoolDragging ? "102-2 파일을 여기에 놓으세요" : "학교 전체 예산도 이어서 볼까요?"}</strong><small>{schoolDragging ? "놓으면 바로 학교 전체 분석을 시작합니다." : "102-2 파일을 이 영역에 끌어놓거나 버튼으로 불러오면 학교 전체 집행현황과 결산예측까지 이어서 볼 수 있어요."}</small></span></div><button className="button ghost compact" onClick={() => fileInputRef.current?.click()} disabled={loading}>{loading ? "분석 중..." : "102-2 불러오기"}<ChevronRight size={16} /></button>{error && <div className="error-message" role="alert"><AlertCircle size={17} />{error}</div>}</div>
        </section>
      ) : (
        <div className="workspace">
          <section className="context-row">
            <div className="school-context"><span className="school-name">{mainView === "school" && meta ? meta.schoolName : `${businessMeta?.year ?? meta?.year ?? new Date().getFullYear()}년 예산`}</span><details className="data-info"><summary>자료 정보</summary><div>{businessMeta && <span><b>{businessMeta.sourceLabel}</b>{businessMeta.fileName}</span>}{meta && <span><b>102-2</b>{meta.fileName}</span>}</div></details></div>
            {mainView !== "school" && businessMeta?.hasManager && businessManagers.length > 0 && <label className="filter-field"><UserRound size={15} />담당자<select value={businessManager} onChange={(event) => setBusinessManager(event.target.value)}><option value="all">전체 담당 사업</option>{businessManagers.map((manager) => <option key={manager} value={manager}>{manager}</option>)}</select></label>}
          </section>
          <nav className="tabs main-tabs" aria-label="학교회계 예산현황판 주 메뉴">
            <button className={mainView === "mine" ? "active" : ""} onClick={() => setMainView("mine")}><BriefcaseBusiness size={17} />내 사업</button>
            <button className={mainView === "plan" ? "active" : ""} onClick={() => setMainView("plan")}><ListChecks size={17} />집행 계획</button>
            {!meta ? <button className={mainView === "school" ? "active" : ""} onClick={() => setMainView("school")}><Building2 size={17} />학교 전체 분석<span className="soon-badge">102-2 추가</span></button> : <>
              <span className="tab-group-label">학교 전체</span>
              <button className={mainView === "school" && tab === "overview" ? "active" : ""} onClick={() => { setMainView("school"); setTab("overview"); }}><BarChart3 size={17} />전체 현황</button>
              <button className={mainView === "school" && tab === "promotion" ? "active" : ""} onClick={() => { setMainView("school"); setTab("promotion"); }}><WalletCards size={17} />업무추진비</button>
              <button className={mainView === "school" && tab === "closing" ? "active" : ""} onClick={() => { setMainView("school"); setTab("closing"); }}><Landmark size={17} />결산예측</button>
            </>}
          </nav>
          {businessMeta && mainView !== "school" && businessError && <div className="replacement-error-banner" role="alert"><AlertCircle size={18} /><span>{businessError}</span></div>}
          {meta && mainView === "school" && error && <div className="replacement-error-banner" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}

          {mainView === "mine" && (businessMeta ? <MyBusinessView rows={visibleBusinessRows} meta={businessMeta} totals={businessTotals} plans={businessPlans} updatePlan={updateBusinessPlan} goPlan={() => setMainView("plan")} /> : <BusinessUploadPrompt choose={() => businessFileInputRef.current?.click()} loading={businessLoading} error={businessError} dragging={businessDragging} setDragging={setBusinessDragging} dropFile={onBusinessDrop} />)}
          {mainView === "plan" && (businessMeta ? <BusinessPlanView rows={visibleBusinessRows} meta={businessMeta} totals={businessTotals} plans={businessPlans} updatePlan={updateBusinessPlan} /> : <BusinessUploadPrompt choose={() => businessFileInputRef.current?.click()} loading={businessLoading} error={businessError} dragging={businessDragging} setDragging={setBusinessDragging} dropFile={onBusinessDrop} />)}
          {mainView === "school" && (!meta ? <SchoolUploadPrompt choose={() => fileInputRef.current?.click()} loading={loading} error={error} dragging={schoolDragging} setDragging={setSchoolDragging} dropFile={onSchoolDrop} /> : <section className="school-area"><div className="school-toolbar"><div className="school-toolbar-main"><span className="school-toolbar-icon"><Building2 size={20} /></span><span className="school-toolbar-copy"><span className="section-kicker">학교 전체 분석</span><strong>{tab === "overview" ? "학교 전체 예산 흐름" : tab === "promotion" ? "업무추진비 계획과 잔액" : "연말 결산예측"}</strong><small>102-2 · {meta.rowCount.toLocaleString("ko-KR")}개 산출내역 · {dateLabel(meta.executionDate)} 기준</small></span></div>{tab !== "closing" && <label className="filter-field school-fund-filter">재원 보기<select value={fundFilter} onChange={(event) => setFundFilter(event.target.value as FundFilter)}><option value="all">전체 사업</option><option value="school">학교운영비</option><option value="purpose">목적사업비</option><option value="revenue">수익자부담</option></select></label>}</div>
          {tab !== "closing" && <FundClassificationSummary rows={rows} />}
          {tab === "overview" && <OverviewTab rows={filteredRows} meta={meta} fundFilter={fundFilter} />}
          {tab === "promotion" && <PromotionTab meta={meta} groups={promotionGroups} totals={promotionTotals} plans={plans} forecast={promotionForecast} plannedTotal={visiblePlannedTotal} recheckCount={promotionRecheckCount} selectedId={selectedPromotionId} selected={selectedPromotion} select={loadSelectedPlan} panelOpen={planPanelOpen} closePanel={() => setPlanPanelOpen(false)} amount={planAmount} setAmount={changePlanAmount} month={planMonth} setMonth={setPlanMonth} memo={planMemo} setMemo={setPlanMemo} save={savePlan} remove={removePlan} currentAmount={currentPlanAmount} selectedForecast={selectedForecast} />}
          {tab === "closing" && <ClosingTab meta={meta} expenseRows={rows} expenseTotals={allTotals} revenueRows={revenueRows} revenueMeta={revenueMeta} inputs={closingInputs} plannedPromotion={plannedTotal} plannedPromotionCount={plannedDetailCount} promotionRecheckCount={promotionRecheckCount} plannedYearEnd={plannedYearEndTotal} openPromotion={() => setTab("promotion")} loading={closingLoading} error={closingError} dragging={closingDragging} setDragging={setClosingDragging} dropFile={onRevenueDrop} chooseFile={() => revenueFileInputRef.current?.click()} changeAdditional={changeAdditionalReceipt} changeAmount={changeClosingAmount} changeTransferReturn={changeTransferReturn} removeTransferReturn={removeTransferReturn} changeDetailPlan={changeDetailSpendingPlan} clearDetailPlan={clearDetailSpendingPlan} resetDetailPlans={resetDetailSpendingPlans} setLegacyDecision={setLegacyDecision} changeMemo={(memo) => setClosingInputs((current) => current ? { ...current, memo } : current)} reset={resetClosing} />}</section>)}
          <footer><span>학돌랩 · senvip</span><span><LockKeyhole size={14} />서버 전송 없음 · 입력값은 현재 브라우저에 저장</span></footer>
        </div>
      )}
      {helpOpen && <HelpModal close={() => setHelpOpen(false)} />}
      {resetConfirmOpen && <ResetDataModal close={() => setResetConfirmOpen(false)} clearExcel={resetLoadedData} clearAll={resetAllStoredInputs} />}
    </main>
  );
}

function FundClassificationSummary({ rows }: { rows: BudgetRow[] }) {
  const summary = useMemo(() => {
    const counts: Record<FundType, number> = { school: 0, purpose: 0, revenue: 0, conflict: 0 };
    const conflictLabels: string[] = [];
    const seen = new Set<string>();
    rows.forEach((row) => {
      counts[row.fundType] += 1;
      if (row.fundType !== "conflict") return;
      const label = [row.projectName, row.itemName, row.calculation].filter(Boolean).join(" › ");
      if (label && !seen.has(label)) {
        seen.add(label);
        if (conflictLabels.length < 5) conflictLabels.push(label);
      }
    });
    const hierarchyCounts = {
      policy: new Set(rows.filter((row) => Boolean(row.policyName)).map((row) => schoolHierarchyId(row, "policy"))).size,
      unit: new Set(rows.filter((row) => Boolean(row.unitName)).map((row) => schoolHierarchyId(row, "unit"))).size,
      project: new Set(rows.filter((row) => Boolean(row.projectName)).map((row) => schoolHierarchyId(row, "project"))).size,
      item: new Set(rows.filter((row) => Boolean(row.itemName)).map((row) => schoolHierarchyId(row, "item"))).size,
      detail: rows.length,
    };
    return { counts, conflictLabels, hierarchyCounts };
  }, [rows]);
  const { counts, conflictLabels, hierarchyCounts } = summary;
  return <div className={`fund-diagnostic ${counts.conflict ? "has-conflict" : ""}`}>
    <details>
      <summary><span className="fund-diagnostic-title"><Info size={14} />재원 분류 결과</span><span className="fund-diagnostic-counts"><b>학교운영비 · 산출내역 {counts.school.toLocaleString("ko-KR")}건</b><b>목적사업비 · 산출내역 {counts.purpose.toLocaleString("ko-KR")}건</b><b>수익자부담 · 산출내역 {counts.revenue.toLocaleString("ko-KR")}건</b>{counts.conflict > 0 && <b className="conflict">확인 필요 · 산출내역 {counts.conflict.toLocaleString("ko-KR")}건</b>}</span><ChevronDown className="fund-diagnostic-chevron" size={15} /></summary>
      <div className="fund-diagnostic-detail"><p>재원 건수는 원본 <strong>산출내역 행 기준</strong>입니다. 세부항목 보기에서는 같은 세부항목이 하나로 묶여 표시됩니다.</p><div className="fund-structure"><strong>데이터 구조</strong><span>정책사업 {hierarchyCounts.policy.toLocaleString("ko-KR")}개 · 단위사업 {hierarchyCounts.unit.toLocaleString("ko-KR")}개 · 세부사업 {hierarchyCounts.project.toLocaleString("ko-KR")}개 · 세부항목 {hierarchyCounts.item.toLocaleString("ko-KR")}개 · 산출내역 {hierarchyCounts.detail.toLocaleString("ko-KR")}건</span></div><p>세부항목과 산출내역의 괄호 표기를 함께 확인하며, 재원 표기가 없으면 학교운영비로 분류합니다.</p>{counts.conflict > 0 && <div className="fund-conflict-list"><strong>서로 다른 재원 표기가 함께 발견된 항목</strong>{conflictLabels.map((label) => <span key={label}>{label}</span>)}{counts.conflict > conflictLabels.length && <small>외 {(counts.conflict - conflictLabels.length).toLocaleString("ko-KR")}건</small>}</div>}</div>
    </details>
    {counts.conflict > 0 && <div className="fund-conflict-warning" role="alert"><AlertCircle size={15} /><span>재원 표기가 서로 다른 산출내역 <strong>{counts.conflict.toLocaleString("ko-KR")}건</strong>이 있습니다. 세부항목·산출내역을 확인해주세요.</span></div>}
  </div>;
}

function FileRouteGuide({ detail }: { detail: string }) {
  return <div className="file-route-guide"><span><Info size={16} />파일 다운로드 경로</span><strong>에듀파인 &gt; 학교회계 &gt; 예산결산 &gt; 결산현황 &gt; 집행실적 엑셀저장(실시간)</strong><small>{detail}</small></div>;
}

function BusinessFileRouteGuide({ compact = false }: { compact?: boolean }) {
  return <div className={`file-route-guide ${compact ? "landing-route-guide" : ""}`}><span><Info size={16} />{compact ? "어디서 받나요?" : "에듀파인 다운로드 경로"}</span><strong>에듀파인 &gt; 학교회계 &gt; 사업관리 &gt; 사업관리카드 &gt; 사업관리카드(현액) 또는 사업관리카드(예산)</strong><small>세출예산집행현황목록도 불러올 수 있습니다. 이 자료는 지급액 열이 없어 원인행위 기준까지만 표시합니다.</small></div>;
}

function BusinessUploadPrompt({ choose, loading, error, dragging, setDragging, dropFile }: { choose: () => void; loading: boolean; error: string; dragging: boolean; setDragging: (value: boolean) => void; dropFile: (event: DragEvent<HTMLDivElement>) => void }) {
  return <section className="centered-upload page-content"><div className="prompt-icon"><BriefcaseBusiness size={28} /></div><span className="section-kicker">내 사업 시작하기</span><h1>사업관리카드를 불러와주세요</h1><p>현액·예산 형식을 자동으로 구분해 지금 새로 사용할 수 있는 금액과 세부항목별 잔액을 보여드려요.</p><div className={`business-prompt-drop-zone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropFile}><UploadCloud size={26} /><strong>{dragging ? "여기에 놓으세요" : "사업관리카드를 끌어놓으세요"}</strong><span>또는</span><button className="button primary" onClick={choose} disabled={loading}><FileSpreadsheet size={18} />{loading ? "분석 중..." : "파일 선택"}</button><small>.xlsx · .xls · 현액/예산 자동 판별</small></div><BusinessFileRouteGuide />{error && <div className="error-message" role="alert"><AlertCircle size={17} />{error}</div>}</section>;
}

function SchoolUploadPrompt({ choose, loading, error, dragging, setDragging, dropFile }: { choose: () => void; loading: boolean; error: string; dragging: boolean; setDragging: (value: boolean) => void; dropFile: (event: DragEvent<HTMLDivElement>) => void }) {
  return <section className="centered-upload page-content school-upload-prompt"><div className="prompt-icon school"><Building2 size={28} /></div><span className="section-kicker">학교 전체 예산 보기</span><h1>102-2로 학교 전체 예산을<br />이어서 살펴봐요</h1><p>102-2 파일을 이 화면에 끌어놓거나 버튼으로 불러오면 학교 전체 집행현황·업무추진비·결산예측까지 한 흐름으로 볼 수 있습니다.</p><div className={`school-prompt-drop-zone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropFile}><span className="drop-kicker">102-2 추가</span><div className="school-prompt-icon"><UploadCloud size={27} /></div><strong>{dragging ? "여기에 놓으세요" : "102-2 파일을 여기에 끌어놓으세요"}</strong><span>또는</span><button className="button primary" onClick={choose} disabled={loading}><FileSpreadsheet size={18} />{loading ? "분석 중..." : "102-2 불러오기"}</button><small>.xlsx · .xls · 파일은 이 브라우저에서만 분석됩니다.</small></div><FileRouteGuide detail="자료코드 102-2를 선택해 내려받으세요." />{error && <div className="error-message" role="alert"><AlertCircle size={17} />{error}</div>}</section>;
}

function MyBusinessView({ rows, meta, totals, plans, updatePlan, goPlan }: {
  rows: BusinessCardRow[];
  meta: BusinessCardMeta;
  totals: { currentBudget: number; obligation: number; paid: number; budgetBalance: number; paymentBalance: number };
  plans: Record<string, number>;
  updatePlan: (row: BusinessCardRow, value: string) => void;
  goPlan: () => void;
}) {
  const [viewMode, setViewMode] = useState<BusinessViewMode>("detail");
  const [filter, setFilter] = useState<BusinessFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<BusinessSort>("amount-desc");
  const [costFilter, setCostFilter] = useState(BUSINESS_COST_FILTER_ALL);
  const [shown, setShown] = useState(30);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedChartProject, setSelectedChartProject] = useState("");
  const [selectedDetailProject, setSelectedDetailProject] = useState("");
  const [chartDetailFocused, setChartDetailFocused] = useState(false);
  const selectedChartDetailRef = useRef<HTMLDivElement>(null);
  const businessVisualRef = useRef<HTMLElement>(null);

  const costNames = useMemo(() => [...new Set(rows.map((row) => row.costName.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")), [rows]);
  const preferredGeneralCostNames = useMemo(() => costNames.filter((name) => normalize(name).includes(normalize("일반수용비"))), [costNames]);
  const otherCostNames = useMemo(() => costNames.filter((name) => !preferredGeneralCostNames.includes(name)), [costNames, preferredGeneralCostNames]);
  const hasPromotionCosts = useMemo(() => costNames.some((name) => normalize(name).includes(normalize("업무추진비"))), [costNames]);
  const selectedCostLabel = costFilter === BUSINESS_COST_FILTER_ALL ? "전체 비목" : costFilter === BUSINESS_COST_FILTER_PROMOTION ? "업무추진비 전체" : costFilter;
  const costScopedRows = useMemo(() => rows.filter((row) => {
    if (costFilter === BUSINESS_COST_FILTER_ALL) return true;
    if (costFilter === BUSINESS_COST_FILTER_PROMOTION) return normalize(row.costName).includes(normalize("업무추진비"));
    return normalize(row.costName) === normalize(costFilter);
  }), [rows, costFilter]);

  useEffect(() => {
    if (costFilter === BUSINESS_COST_FILTER_ALL) return;
    if (costFilter === BUSINESS_COST_FILTER_PROMOTION) {
      if (!hasPromotionCosts) setCostFilter(BUSINESS_COST_FILTER_ALL);
      return;
    }
    if (!costNames.some((name) => normalize(name) === normalize(costFilter))) setCostFilter(BUSINESS_COST_FILTER_ALL);
  }, [costFilter, costNames, hasPromotionCosts]);

  const filteredRows = useMemo(() => costScopedRows.filter((row) => {
    if (selectedDetailProject && normalize(row.projectName) !== normalize(selectedDetailProject)) return false;
    if (filter === "available" && row.budgetBalance <= 0) return false;
    if (filter === "complete" && row.budgetBalance !== 0) return false;
    const needle = normalize(search);
    return !needle || normalize(`${row.projectName}${row.itemName}${row.costName}${row.calculation}`).includes(needle);
  }).sort((a, b) => compareBusiness(a, b, sort)), [costScopedRows, selectedDetailProject, filter, search, sort]);

  const filteredItems = useMemo(() => {
    const grouped = new Map<string, BusinessItemGroup>();
    filteredRows.forEach((row) => {
      const id = `${normalize(row.projectName)}|${normalize(row.itemName)}`;
      const current = grouped.get(id) ?? { id, projectName: row.projectName || "사업명 없음", itemName: row.itemName || "세부항목 없음", currentBudget: 0, obligation: 0, paid: 0, budgetBalance: 0, paymentBalance: 0, rows: [] };
      current.currentBudget += row.currentBudget;
      current.obligation += row.obligation;
      current.paid += row.paid;
      current.budgetBalance += row.budgetBalance;
      current.paymentBalance += row.paymentBalance;
      current.rows.push(row);
      grouped.set(id, current);
    });
    return [...grouped.values()].sort((a, b) => compareBusiness(a, b, sort));
  }, [filteredRows, sort]);

  const filteredProjects = useMemo(() => {
    const grouped = new Map<string, BusinessProjectGroup>();
    filteredItems.forEach((item) => {
      const id = normalize(item.projectName) || "project";
      const current = grouped.get(id) ?? { id, projectName: item.projectName || "사업명 없음", currentBudget: 0, obligation: 0, paid: 0, budgetBalance: 0, paymentBalance: 0, rows: [], items: [] };
      current.currentBudget += item.currentBudget;
      current.obligation += item.obligation;
      current.paid += item.paid;
      current.budgetBalance += item.budgetBalance;
      current.paymentBalance += item.paymentBalance;
      current.rows.push(...item.rows);
      current.items.push(item);
      grouped.set(id, current);
    });
    return [...grouped.values()].sort((a, b) => compareBusiness(a, b, sort));
  }, [filteredItems, sort]);

  const filteredTotals = useMemo(() => filteredRows.reduce((sum, row) => ({
    currentBudget: sum.currentBudget + row.currentBudget,
    obligation: sum.obligation + row.obligation,
    paid: sum.paid + row.paid,
    budgetBalance: sum.budgetBalance + row.budgetBalance,
    paymentBalance: sum.paymentBalance + row.paymentBalance,
  }), { currentBudget: 0, obligation: 0, paid: 0, budgetBalance: 0, paymentBalance: 0 }), [filteredRows]);

  const plannedTotal = useMemo(() => filteredRows.reduce((sum, row) => sum + (plans[businessPlanKey(meta, row)] ?? 0), 0), [filteredRows, plans, meta]);
  const forecastTotal = filteredTotals.budgetBalance - plannedTotal;
  const obligationRate = filteredTotals.currentBudget ? Math.max(0, Math.min(100, filteredTotals.obligation / filteredTotals.currentBudget * 100)) : 0;
  const paymentRate = filteredTotals.currentBudget ? Math.max(0, Math.min(100, filteredTotals.paid / filteredTotals.currentBudget * 100)) : 0;

  const chartProjects = useMemo(() => {
    const grouped = new Map<string, BusinessProjectGroup>();
    costScopedRows.forEach((row) => {
      const id = normalize(row.projectName) || "project";
      const current = grouped.get(id) ?? { id, projectName: row.projectName || "사업명 없음", currentBudget: 0, obligation: 0, paid: 0, budgetBalance: 0, paymentBalance: 0, rows: [], items: [] };
      current.currentBudget += row.currentBudget;
      current.obligation += row.obligation;
      current.paid += row.paid;
      current.budgetBalance += row.budgetBalance;
      current.paymentBalance += row.paymentBalance;
      current.rows.push(row);
      grouped.set(id, current);
    });
    return [...grouped.values()].map((project) => {
      const planned = project.rows.reduce((sum, row) => sum + (plans[businessPlanKey(meta, row)] ?? 0), 0);
      return { ...project, planned, forecast: project.budgetBalance - planned };
    }).filter((project) => project.forecast > 0).sort((a, b) => b.forecast - a.forecast).slice(0, 10);
  }, [costScopedRows, plans, meta]);
  const chartMaxForecast = useMemo(() => Math.max(...chartProjects.map((project) => project.forecast), 1), [chartProjects]);
  const selectedChart = chartProjects.find((project) => project.id === selectedChartProject) ?? null;
  const hasActiveScope = Boolean(selectedDetailProject) || filter !== "all" || Boolean(normalize(search)) || costFilter !== BUSINESS_COST_FILTER_ALL;

  useEffect(() => {
    if (!selectedChartProject) {
      setChartDetailFocused(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = selectedChartDetailRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const sufficientlyVisible = rect.top >= 88 && rect.bottom <= window.innerHeight - 36;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!sufficientlyVisible) {
        element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      }

      setChartDetailFocused(true);
    });

    const timer = window.setTimeout(() => setChartDetailFocused(false), 900);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [selectedChartProject]);

  const toggleProject = (id: string) => setExpandedProjects((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleItem = (id: string) => setExpandedItems((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const changeViewMode = (mode: BusinessViewMode) => { setViewMode(mode); setShown(30); };
  const returnToProjectNavigator = () => {
    const element = businessVisualRef.current;
    if (!element) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };
  const clearDetailProjectScope = () => {
    setSelectedDetailProject("");
    setShown(30);
  };
  const selectChartProject = (project: { id: string; projectName: string }) => {
    const selected = selectedChartProject === project.id;
    setSelectedChartProject(selected ? "" : project.id);
    if (!selected && selectedDetailProject && normalize(selectedDetailProject) !== normalize(project.projectName)) {
      setSelectedDetailProject("");
      setShown(30);
    }
  };
  const focusChartProject = (projectName: string) => {
    setSelectedDetailProject(projectName);
    setSearch("");
    setFilter("all");
    setViewMode("project");
    setShown(30);
    window.setTimeout(() => {
      const element = document.getElementById("business-detail-start");
      if (!element) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }, 0);
  };

  const renderItemGroup = (group: BusinessItemGroup, nested = false) => {
    const expanded = expandedItems.has(group.id);
    const planned = group.rows.reduce((total, row) => total + (plans[businessPlanKey(meta, row)] ?? 0), 0);
    const forecast = group.budgetBalance - planned;
    const rate = group.currentBudget ? Math.max(0, Math.min(100, group.obligation / group.currentBudget * 100)) : 0;
    return <article className={`business-item-group ${nested ? "nested" : ""} ${group.budgetBalance === 0 ? "complete" : ""} ${forecast < 0 ? "over-plan" : ""}`} key={group.id}>
      <button className="business-item-summary" onClick={() => toggleItem(group.id)} aria-expanded={expanded}>
        <div className="business-item-title"><span>{nested ? "세부항목" : group.projectName}</span><h3>{group.itemName}</h3><small>산출내역 {group.rows.length}건 · 원인행위 {formatPercent(rate)}</small></div>
        <div className="business-balance-primary"><small>현재 잔액</small><strong>{formatWon(group.budgetBalance)}</strong></div>
        <div className="business-balance-basis"><span><small>전체 예산</small><strong>{formatWon(group.currentBudget)}</strong></span><span><small>사용 결정</small><strong>{formatWon(group.obligation)}</strong></span></div>
        <div className={`business-plan-impact ${planned > 0 ? "has-plan" : "no-plan"} ${forecast < 0 ? "negative" : ""}`}>{planned > 0 ? <><span><small>앞으로 사용할 예정</small><strong>{formatWon(planned)}</strong></span><span className="result"><small>계획 반영 후 잔액</small><ForecastAmount value={forecast} showWarning /></span></> : <span className="no-plan-copy"><small>앞으로 사용할 예정</small><strong>계획 없음</strong></span>}</div>
        <span className="business-item-expand">{expanded ? "산출내역 접기" : `산출내역 ${group.rows.length}건 보기`}<ChevronDown className={expanded ? "rotated" : ""} size={17} /></span>
      </button>
      {expanded && <div className="business-item-details">{[...group.rows].sort((a, b) => compareBusiness(a, b, sort)).map((row) => <BusinessDetailCard key={row.id} row={row} plan={plans[businessPlanKey(meta, row)] ?? 0} updatePlan={updatePlan} />)}</div>}
    </article>;
  };

  return <div className="page-content business-page">
    <section className="business-overview-summary" aria-labelledby="business-summary-title">
      <div className="business-summary-head"><div className="section-heading"><span className="section-kicker">내 사업 분석</span><h1 id="business-summary-title">지금 남은 예산부터 확인하세요</h1><p>{hasActiveScope ? `${costFilter !== BUSINESS_COST_FILTER_ALL ? `비목 ‘${selectedCostLabel}’ · ` : ""}${selectedDetailProject ? `세부사업 ‘${selectedDetailProject}’` : `현재 검색·필터 결과 ${filteredRows.length}건`} 기준의 현재 잔액입니다. 계획을 입력하면 반영 후 잔액도 함께 계산합니다.` : "현재 잔액을 먼저 보여주고, 앞으로 쓸 계획이 있을 때만 반영 후 잔액을 함께 보여드립니다."}</p></div>{hasActiveScope && <button className="button ghost compact" onClick={() => { setSelectedDetailProject(""); setFilter("all"); setCostFilter(BUSINESS_COST_FILTER_ALL); setSearch(""); setShown(30); }}>선택·검색 초기화</button>}</div>
      <div className="business-hero-metrics balance-first">
        <article className={`business-hero-balance current ${filteredTotals.budgetBalance < 0 ? "negative" : ""}`}>
          <div className="business-hero-balance-label"><span className="business-summary-icon"><CircleDollarSign size={20} /></span><span><small>지금 바로 확인할 금액</small><b>현재 잔액</b></span></div>
          <strong>{formatKpiWon(filteredTotals.budgetBalance)}</strong>
          <p>전체 예산 <b>{formatReadableWon(filteredTotals.currentBudget)}</b> · 사용 결정 <b>{formatReadableWon(filteredTotals.obligation)}</b></p>
        </article>
        <div className="business-support-metrics balance-first-support">
          <article className="business-support-metric budget"><span><WalletCards size={17} />전체 예산</span><small>예산현액</small><strong>{formatKpiWon(filteredTotals.currentBudget)}</strong><em>{formatWon(filteredTotals.currentBudget)}</em></article>
          <article className="business-support-metric committed"><span><ReceiptText size={17} />사용 결정</span><small>원인행위액</small><strong>{formatKpiWon(filteredTotals.obligation)}</strong><em>{formatWon(filteredTotals.obligation)}</em></article>
          {plannedTotal > 0 ? <article className={`business-support-metric plan-result ${forecastTotal < 0 ? "negative" : ""}`}><span><CalendarDays size={17} />계획 반영 후 잔액</span><small>사용 예정 {formatReadableWon(plannedTotal)} 차감</small><strong>{formatKpiWon(forecastTotal)}</strong><em>{formatWon(forecastTotal)}</em></article> : <article className="business-support-metric planned quiet"><span><CalendarDays size={17} />앞으로 사용할 예정</span><small>필요할 때 산출내역에 입력</small><strong>0원</strong><em>입력된 집행계획 없음</em></article>}
        </div>
      </div>
    </section>

    <section ref={businessVisualRef} className="business-visual-section" aria-labelledby="business-visual-title">
      <div className="business-visual-head"><div className="section-heading"><span className="section-kicker">잔액 분석</span><h2 id="business-visual-title">어디에 예산이 많이 남아 있을까요?</h2><p>집행계획까지 반영한 잔액을 큰 순서로 보여드립니다.</p><span className="business-top-badge">{costFilter !== BUSINESS_COST_FILTER_ALL ? `${selectedCostLabel} · ` : ""}세부사업 기준 · Top {Math.min(chartProjects.length, 10)}</span></div></div>
      <div className="business-visual-content">
        {chartProjects.length > 0 ? <div className="business-chart" role="list">{chartProjects.map((project, index) => {
          const barPct = Math.max(3, (project.forecast / chartMaxForecast) * 100);
          const selected = selectedChartProject === project.id;
          return <button type="button" role="listitem" key={project.id} className={`business-chart-row ${selected ? "selected" : ""}`} onClick={() => selectChartProject(project)} aria-expanded={selected}>
            <span className="business-chart-rank">{index + 1}</span>
            <span className="business-chart-head"><span className="business-chart-name">{project.projectName}</span><span className="business-chart-value"><small>예상 잔액</small><strong>{formatKpiWon(project.forecast)}</strong></span></span>
            <span className="business-chart-track" aria-hidden="true"><i className="forecast" style={{ width: `${barPct}%` }} /></span>
            <span className="business-chart-meta"><span>사용 결정 <b>{formatCompactWon(project.obligation)}</b></span>{project.planned > 0 && <span className="planned">+ 사용 예정 <b>{formatCompactWon(project.planned)}</b></span>}</span>
          </button>;
        })}</div> : <EmptyState text="계획 반영 후 남는 금액이 있는 세부사업이 없습니다." />}
        {selectedChart && <div ref={selectedChartDetailRef} className={`business-chart-detail ${chartDetailFocused ? "is-focused" : ""}`} aria-live="polite"><div><span>선택한 세부사업</span><strong>{selectedChart.projectName}</strong></div><dl><div><dt>내 예산</dt><dd title={formatWon(selectedChart.currentBudget)}>{formatKpiWon(selectedChart.currentBudget)}</dd></div><div><dt>사용 결정액</dt><dd title={formatWon(selectedChart.obligation)}>{formatKpiWon(selectedChart.obligation)}</dd></div><div><dt>사용 예정</dt><dd title={formatWon(selectedChart.planned)}>{formatKpiWon(selectedChart.planned)}</dd></div><div><dt>예상 잔액</dt><dd title={formatWon(selectedChart.forecast)}>{formatKpiWon(selectedChart.forecast)}</dd></div></dl><div className="business-chart-actions"><button className="business-chart-list-button" onClick={() => focusChartProject(selectedChart.projectName)}>이 사업 상세 보기<ChevronRight size={14} /></button><button className="business-chart-back-button" onClick={returnToProjectNavigator}><ArrowUp size={14} />다른 사업 선택</button></div></div>}
        <p className="business-chart-note"><Info size={14} />막대가 길수록 계획까지 반영한 뒤 남는 예산이 큽니다. 사용 예정 금액은 입력된 경우에만 표시합니다.</p>
      </div>
    </section>

    <details className="business-progress business-progress-details"><summary><span><b>집행 단계도 확인하기</b><small>{meta.hasPaymentDetail ? "원인행위와 지급 완료를 전체 예산 기준으로 비교합니다." : "이 자료에는 지급액 열이 없어 원인행위 기준까지만 표시합니다."}</small></span><ChevronDown size={18} /></summary><div className="business-progress-grid"><ProgressStep title="이미 사용하기로 한 금액" label="원인행위 기준" rate={obligationRate} primaryLabel="원인행위액" primaryValue={filteredTotals.obligation} remainderLabel="현재 사용 가능" remainderValue={filteredTotals.budgetBalance} tone="blue" />{meta.hasPaymentDetail && <ProgressStep title="지급 완료" label="지급 기준" rate={paymentRate} primaryLabel="지급액" primaryValue={filteredTotals.paid} remainderLabel="지급 전 금액 포함 잔액" remainderValue={filteredTotals.paymentBalance} tone="violet" />}</div></details>

    <section className="business-detail-section" id="business-detail-start"><div className="split-heading business-list-head"><div className="section-heading"><span className="section-kicker">예산 상세</span><h2>보고 싶은 단위로 묶어보세요</h2><p>{viewMode === "project" ? "여러 세부항목을 세부사업 단위로 크게 묶어 봅니다." : viewMode === "item" ? "같은 세부항목의 산출내역을 합쳐 봅니다." : "실제 산출내역을 한 줄씩 그대로 확인합니다."}</p></div><div className="business-list-head-actions">{selectedDetailProject && <button className="business-back-to-top-button" onClick={returnToProjectNavigator}><ArrowUp size={15} />다른 사업 선택</button>}<button className="button secondary compact" onClick={goPlan}><ListChecks size={16} />집행 계획 모아보기</button></div></div>
      {selectedDetailProject && <div className="business-active-project-scope" aria-label="선택한 세부사업 필터"><span>선택한 사업</span><strong>{selectedDetailProject}</strong><button onClick={clearDetailProjectScope} aria-label={`${selectedDetailProject} 선택 해제`}><X size={14} />전체 보기</button></div>}
      {costFilter !== BUSINESS_COST_FILTER_ALL && <div className="business-active-project-scope business-active-cost-scope" aria-label="선택한 비목 필터"><span>선택 비목</span><strong>{selectedCostLabel}</strong><button onClick={() => { setCostFilter(BUSINESS_COST_FILTER_ALL); setShown(30); }} aria-label={`${selectedCostLabel} 비목 필터 해제`}><X size={14} />비목 해제</button></div>}
      <div className="business-view-row"><div className="business-view-toggle" role="group" aria-label="예산 상세 묶어 보기 기준"><button className={viewMode === "project" ? "active" : ""} onClick={() => changeViewMode("project")}>세부사업으로 묶기</button><button className={viewMode === "item" ? "active" : ""} onClick={() => changeViewMode("item")}>세부항목으로 묶기</button><button className={viewMode === "detail" ? "active" : ""} onClick={() => changeViewMode("detail")}>산출내역 그대로</button></div><span className="business-view-count">{viewMode === "project" ? `세부사업 ${filteredProjects.length}개 · 산출내역 ${filteredRows.length}건` : viewMode === "item" ? `세부항목 ${filteredItems.length}개 · 산출내역 ${filteredRows.length}건` : `산출내역 ${filteredRows.length}건`}</span></div>
      <div className="business-controls"><div className="filter-tabs" role="group" aria-label="예산 상세 필터">{(["all", "available", "complete"] as BusinessFilter[]).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => { setFilter(value); setShown(30); }}>{value === "all" ? "전체" : value === "available" ? "잔액 있음" : "집행 완료"}</button>)}</div><div className="business-control-tools"><label className="business-sort business-cost-filter"><span>비목</span><select value={costFilter} onChange={(event) => { setCostFilter(event.target.value); setSelectedChartProject(""); setShown(30); }}><option value={BUSINESS_COST_FILTER_ALL}>전체 비목</option>{preferredGeneralCostNames.map((name) => <option key={`preferred-${name}`} value={name}>{name}</option>)}{hasPromotionCosts && <option value={BUSINESS_COST_FILTER_PROMOTION}>업무추진비 전체</option>}{otherCostNames.length > 0 && <optgroup label="전체 비목">{otherCostNames.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>}</select></label><label className="business-sort"><span>정렬</span><select value={sort} onChange={(event) => { setSort(event.target.value as BusinessSort); setShown(30); }}><option value="name-asc">이름 가나다순</option><option value="name-desc">이름 역순</option><option value="project-asc">세부사업 가나다순</option><option value="project-desc">세부사업 역순</option><option value="item-asc">세부항목 가나다순</option><option value="item-desc">세부항목 역순</option><option value="amount-desc">현재 잔액 많은 순</option><option value="amount-asc">현재 잔액 적은 순</option></select></label><label className="business-search"><span className="sr-only">예산 상세 검색</span><input value={search} onChange={(event) => { setSearch(event.target.value); setShown(30); }} placeholder={viewMode === "project" ? "세부사업·세부항목 검색" : viewMode === "item" ? "사업·세부항목 검색" : "사업·산출내역 검색"} /></label></div></div>
      {viewMode === "project" ? <div className="business-project-list">{filteredProjects.map((project) => {
        const expanded = expandedProjects.has(project.id);
        const planned = project.rows.reduce((total, row) => total + (plans[businessPlanKey(meta, row)] ?? 0), 0);
        const forecast = project.budgetBalance - planned;
        const rate = project.currentBudget ? Math.max(0, Math.min(100, project.obligation / project.currentBudget * 100)) : 0;
        return <article className={`business-project-group ${project.budgetBalance === 0 ? "complete" : ""} ${forecast < 0 ? "over-plan" : ""}`} key={project.id}>
          <button className="business-project-summary" onClick={() => toggleProject(project.id)} aria-expanded={expanded}>
            <div className="business-project-title"><span>세부사업</span><h3>{project.projectName}</h3><small>세부항목 {project.items.length}개 · 산출내역 {project.rows.length}건 · 원인행위 {formatPercent(rate)}</small></div>
            <div className="business-balance-primary"><small>현재 잔액</small><strong>{formatWon(project.budgetBalance)}</strong></div>
            <div className="business-balance-basis"><span><small>전체 예산</small><strong>{formatWon(project.currentBudget)}</strong></span><span><small>사용 결정</small><strong>{formatWon(project.obligation)}</strong></span></div>
            <div className={`business-plan-impact ${planned > 0 ? "has-plan" : "no-plan"} ${forecast < 0 ? "negative" : ""}`}>{planned > 0 ? <><span><small>앞으로 사용할 예정</small><strong>{formatWon(planned)}</strong></span><span className="result"><small>계획 반영 후 잔액</small><ForecastAmount value={forecast} showWarning /></span></> : <span className="no-plan-copy"><small>앞으로 사용할 예정</small><strong>계획 없음</strong></span>}</div>
            <span className="business-item-expand">{expanded ? "세부항목 접기" : `세부항목 ${project.items.length}개 보기`}<ChevronDown className={expanded ? "rotated" : ""} size={17} /></span>
          </button>
          {expanded && <div className="business-project-items">{project.items.map((item) => renderItemGroup(item, true))}{project.items.length === 0 && <EmptyState text="조건에 맞는 세부항목이 없습니다." />}</div>}
        </article>;
      })}{filteredProjects.length === 0 && <EmptyState text="조건에 맞는 세부사업이 없습니다." />}</div> : viewMode === "item" ? <div className="business-item-list">{filteredItems.map((group) => renderItemGroup(group))}{filteredItems.length === 0 && <EmptyState text="조건에 맞는 세부항목이 없습니다." />}</div> : <>
        <div className="business-detail-list">{filteredRows.slice(0, shown).map((row) => <BusinessDetailCard key={row.id} row={row} plan={plans[businessPlanKey(meta, row)] ?? 0} updatePlan={updatePlan} />)}{filteredRows.length === 0 && <EmptyState text="조건에 맞는 산출내역이 없습니다." />}</div>
        {shown < filteredRows.length && <button className="button secondary full load-more" onClick={() => setShown((value) => value + 30)}>산출내역 더 보기 · {filteredRows.length - shown}건 남음</button>}
      </>}
    </section>
  </div>;
}

function BusinessDetailCard({ row, plan, updatePlan }: { row: BusinessCardRow; plan: number; updatePlan: (row: BusinessCardRow, value: string) => void }) {
  const forecast = row.budgetBalance - plan;
  return <article className={`business-detail-card ${row.budgetBalance === 0 ? "complete" : ""} ${forecast < 0 ? "over-plan" : ""}`}>
    <div className="business-detail-title"><span>{row.projectName} · {row.itemName}</span><h3>{row.calculation}</h3><small>{row.costName}</small></div>
    <div className="business-detail-balance"><small>현재 잔액</small><strong>{formatWon(row.budgetBalance)}</strong></div>
    <div className="business-detail-basis"><span><small>전체 예산</small><strong>{formatWon(row.currentBudget)}</strong></span><span><small>사용 결정</small><strong>{formatWon(row.obligation)}</strong></span></div>
    <div className={`inline-business-plan ${plan > 0 ? "has-plan" : ""}`}><label><span>앞으로 사용할 예정</span><div className="won-input"><input inputMode="numeric" value={plan ? plan.toLocaleString("ko-KR") : ""} onChange={(event) => updatePlan(row, event.target.value)} placeholder="0" aria-label={`${row.calculation} 앞으로 사용할 예정 금액`} /><span>원</span></div></label>{plan > 0 && <div className="inline-plan-result"><small>계획 반영 후 잔액</small><ForecastAmount value={forecast} showWarning /></div>}</div>
  </article>;
}

function BusinessPlanView({ rows, meta, totals, plans, updatePlan }: {
  rows: BusinessCardRow[];
  meta: BusinessCardMeta;
  totals: { currentBudget: number; obligation: number; paid: number; budgetBalance: number; paymentBalance: number };
  plans: Record<string, number>;
  updatePlan: (row: BusinessCardRow, value: string) => void;
}) {
  const [viewMode, setViewMode] = useState<BusinessViewMode>("item");
  const [filter, setFilter] = useState<"all" | "planned" | "empty">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<BusinessSort>("amount-desc");
  const [costFilter, setCostFilter] = useState(BUSINESS_COST_FILTER_ALL);
  const [shown, setShown] = useState(30);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [summaryCondensed, setSummaryCondensed] = useState(false);
  const summaryRef = useRef<HTMLElement | null>(null);
  const costNames = useMemo(() => [...new Set(rows.map((row) => row.costName.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")), [rows]);
  const preferredGeneralCostNames = useMemo(() => costNames.filter((name) => normalize(name).includes(normalize("일반수용비"))), [costNames]);
  const otherCostNames = useMemo(() => costNames.filter((name) => !preferredGeneralCostNames.includes(name)), [costNames, preferredGeneralCostNames]);
  const hasPromotionCosts = useMemo(() => costNames.some((name) => normalize(name).includes(normalize("업무추진비"))), [costNames]);
  const selectedCostLabel = costFilter === BUSINESS_COST_FILTER_ALL ? "전체 비목" : costFilter === BUSINESS_COST_FILTER_PROMOTION ? "업무추진비 전체" : costFilter;
  const costScopedRows = useMemo(() => rows.filter((row) => {
    if (costFilter === BUSINESS_COST_FILTER_ALL) return true;
    if (costFilter === BUSINESS_COST_FILTER_PROMOTION) return normalize(row.costName).includes(normalize("업무추진비"));
    return normalize(row.costName) === normalize(costFilter);
  }), [rows, costFilter]);
  useEffect(() => {
    if (costFilter === BUSINESS_COST_FILTER_ALL) return;
    if (costFilter === BUSINESS_COST_FILTER_PROMOTION) {
      if (!hasPromotionCosts) setCostFilter(BUSINESS_COST_FILTER_ALL);
      return;
    }
    if (!costNames.some((name) => normalize(name) === normalize(costFilter))) setCostFilter(BUSINESS_COST_FILTER_ALL);
  }, [costFilter, costNames, hasPromotionCosts]);
  const scopedBudgetBalance = costScopedRows.reduce((total, row) => total + row.budgetBalance, 0);
  const plannedTotal = costScopedRows.reduce((total, row) => total + (plans[businessPlanKey(meta, row)] ?? 0), 0);
  const forecastTotal = scopedBudgetBalance - plannedTotal;

  const itemGroups = useMemo(() => {
    const grouped = new Map<string, BusinessPlanItemGroup>();
    costScopedRows.forEach((row) => {
      const id = `${normalize(row.projectName)}|${normalize(row.itemName)}`;
      const current = grouped.get(id) ?? { id, projectName: row.projectName || "사업명 없음", itemName: row.itemName || "세부항목 없음", budgetBalance: 0, rows: [] };
      current.budgetBalance += row.budgetBalance;
      current.rows.push(row);
      grouped.set(id, current);
    });
    return [...grouped.values()];
  }, [costScopedRows]);

  const projectGroups = useMemo(() => {
    const grouped = new Map<string, BusinessPlanProjectGroup>();
    itemGroups.forEach((item) => {
      const id = normalize(item.projectName) || "project";
      const current = grouped.get(id) ?? { id, projectName: item.projectName || "사업명 없음", budgetBalance: 0, rows: [], items: [] };
      current.budgetBalance += item.budgetBalance;
      current.rows.push(...item.rows);
      current.items.push(item);
      grouped.set(id, current);
    });
    return [...grouped.values()];
  }, [itemGroups]);

  const rowMatches = (row: BusinessCardRow, needle: string) => {
    const plan = plans[businessPlanKey(meta, row)] ?? 0;
    if (filter === "planned" && !plan) return false;
    if (filter === "empty" && (plan || row.budgetBalance <= 0)) return false;
    return !needle || normalize(`${row.projectName}${row.itemName}${row.costName}${row.calculation}`).includes(needle);
  };

  const visibleRows = useMemo(() => {
    const needle = normalize(search);
    return costScopedRows.filter((row) => rowMatches(row, needle)).sort((a, b) => compareBusiness(a, b, sort));
  }, [costScopedRows, plans, meta, filter, search, sort]);

  const visibleGroups = useMemo(() => {
    const needle = normalize(search);
    return itemGroups.filter((group) => {
      const groupSearchMatch = !needle || normalize(`${group.projectName}${group.itemName}`).includes(needle);
      return group.rows.some((row) => rowMatches(row, groupSearchMatch ? "" : needle));
    }).sort((a, b) => compareBusiness(a, b, sort));
  }, [itemGroups, plans, meta, filter, search, sort]);

  const visibleProjects = useMemo(() => {
    const visibleItemIds = new Set(visibleGroups.map((group) => group.id));
    return projectGroups.filter((project) => project.items.some((item) => visibleItemIds.has(item.id))).sort((a, b) => compareBusiness(a, b, sort));
  }, [projectGroups, visibleGroups, sort]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const summary = summaryRef.current;
      if (!summary) return;
      const topbar = document.querySelector<HTMLElement>(".topbar");
      const threshold = (topbar?.getBoundingClientRect().height ?? 64) + 8;
      setSummaryCondensed(summary.getBoundingClientRect().bottom <= threshold);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const toggleProject = (id: string) => setExpandedProjects((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleItem = (id: string) => setExpandedItems((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const changeViewMode = (mode: BusinessViewMode) => { setViewMode(mode); setShown(30); };
  const changeFilter = (value: "all" | "planned" | "empty") => { setFilter(value); setShown(30); };
  const detailRowsForGroup = (group: BusinessPlanItemGroup) => {
    const needle = normalize(search);
    const groupNameMatch = !needle || normalize(`${group.projectName}${group.itemName}`).includes(needle);
    return group.rows.filter((row) => rowMatches(row, groupNameMatch ? "" : needle)).sort((a, b) => compareBusiness(a, b, sort));
  };
  const renderPlanItem = (group: BusinessPlanItemGroup, nested = false) => {
    const expanded = expandedItems.has(group.id);
    const planned = group.rows.reduce((total, row) => total + (plans[businessPlanKey(meta, row)] ?? 0), 0);
    const forecast = group.budgetBalance - planned;
    const plannedCount = group.rows.filter((row) => (plans[businessPlanKey(meta, row)] ?? 0) > 0).length;
    const detailRows = detailRowsForGroup(group);
    return <article className={`business-plan-group ${nested ? "nested" : ""} ${forecast < 0 ? "over-plan" : ""}`} key={group.id}>
      <button className="business-plan-group-summary" onClick={() => toggleItem(group.id)} aria-expanded={expanded}>
        <div className="business-plan-group-title"><span>{nested ? "세부항목" : group.projectName}</span><h3>{group.itemName}</h3><small>산출내역 {group.rows.length}건 · 계획 {plannedCount}건 입력</small></div>
        <div className="business-plan-group-metrics"><span><small>현재 사용 가능</small><strong>{formatWon(group.budgetBalance)}</strong></span><span><small>앞으로 사용할 예정</small><strong>{formatWon(planned)}</strong></span><span className="forecast"><small>예상 잔액</small><ForecastAmount value={forecast} showWarning /></span></div>
        <span className="business-item-expand">{expanded ? "산출내역 접기" : `산출내역 ${detailRows.length}건 보기`}<ChevronDown className={expanded ? "rotated" : ""} size={17} /></span>
      </button>
      {expanded && <div className="business-plan-group-details">{detailRows.map((row) => <BusinessPlanRow key={row.id} row={row} meta={meta} plans={plans} updatePlan={updatePlan} />)}{detailRows.length === 0 && <EmptyState text="조건에 맞는 산출내역이 없습니다." />}</div>}
    </article>;
  };

  return <div className="page-content business-page">
    <section ref={summaryRef} className="plan-summary"><div className="section-heading"><span className="section-kicker">집행 계획</span><h1>앞으로 쓸 금액을 정리해요</h1><p>{costFilter === BUSINESS_COST_FILTER_ALL ? "기본은 세부항목별로 보고, 필요한 비목만 골라 계획을 정리할 수 있어요. 실제 금액 입력은 산출내역별로 유지됩니다." : `비목 ‘${selectedCostLabel}’ 기준으로 사용 가능액과 입력된 계획을 다시 계산합니다.`}</p></div><div className="plan-summary-grid"><article><span>현재 사용 가능</span><strong>{formatCompactWon(scopedBudgetBalance)}</strong></article><article><span>앞으로 사용할 예정</span><strong>{formatCompactWon(plannedTotal)}</strong></article><article className={forecastTotal < 0 ? "negative" : ""}><span>계획 반영 후 예상 잔액</span><ForecastAmount value={forecastTotal} compact showWarning /></article></div></section>
    {summaryCondensed && <aside className={`plan-summary-compact ${forecastTotal < 0 ? "negative" : ""}`} aria-label="집행 계획 요약"><div className="plan-compact-title"><ListChecks size={17} /><strong>집행 계획</strong></div><div className="plan-compact-metrics"><span><small>사용 가능</small><strong>{formatCompactWon(scopedBudgetBalance)}</strong></span><span><small>사용 예정</small><strong>{formatCompactWon(plannedTotal)}</strong></span><span className="forecast"><small>예상 잔액</small><strong>{formatCompactWon(forecastTotal)}</strong></span></div></aside>}
    <section className="business-detail-section">
      <div className="business-view-row"><div className="business-view-toggle" role="group" aria-label="집행 계획 보기 기준"><button className={viewMode === "project" ? "active" : ""} onClick={() => changeViewMode("project")}>세부사업별</button><button className={viewMode === "item" ? "active" : ""} onClick={() => changeViewMode("item")}>세부항목별</button><button className={viewMode === "detail" ? "active" : ""} onClick={() => changeViewMode("detail")}>산출내역별</button></div><span className="business-view-count">{viewMode === "project" ? `세부사업 ${visibleProjects.length}개 · 세부항목 ${visibleGroups.length}개` : viewMode === "item" ? `세부항목 ${visibleGroups.length}개 · 산출내역 ${costScopedRows.length}건` : `산출내역 ${visibleRows.length}건`}</span></div>
      <div className="business-controls"><div className="filter-tabs">{(["all", "planned", "empty"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => changeFilter(value)}>{value === "all" ? "전체" : value === "planned" ? "계획 입력됨" : "계획 미입력"}</button>)}</div><div className="business-control-tools"><label className="business-sort business-cost-filter"><span>비목</span><select value={costFilter} onChange={(event) => { setCostFilter(event.target.value); setShown(30); }}><option value={BUSINESS_COST_FILTER_ALL}>전체 비목</option>{preferredGeneralCostNames.map((name) => <option key={`plan-preferred-${name}`} value={name}>{name}</option>)}{hasPromotionCosts && <option value={BUSINESS_COST_FILTER_PROMOTION}>업무추진비 전체</option>}{otherCostNames.length > 0 && <optgroup label="전체 비목">{otherCostNames.map((name) => <option key={`plan-cost-${name}`} value={name}>{name}</option>)}</optgroup>}</select></label><label className="business-sort"><span>정렬</span><select value={sort} onChange={(event) => { setSort(event.target.value as BusinessSort); setShown(30); }}><option value="name-asc">전체 이름 가나다순</option><option value="name-desc">전체 이름 역순</option><option value="project-asc">세부사업 가나다순</option><option value="project-desc">세부사업 역순</option><option value="item-asc">세부항목 가나다순</option><option value="item-desc">세부항목 역순</option><option value="amount-desc">현재 잔액 많은 순</option><option value="amount-asc">현재 잔액 적은 순</option></select></label><label className="business-search"><span className="sr-only">집행 계획 검색</span><input value={search} onChange={(event) => { setSearch(event.target.value); setShown(30); }} placeholder={viewMode === "project" ? "세부사업·세부항목 검색" : viewMode === "item" ? "사업·세부항목 검색" : "사업·산출내역 검색"} /></label></div></div>
      {viewMode === "project" ? <div className="business-plan-projects">{visibleProjects.map((project) => {
        const expanded = expandedProjects.has(project.id);
        const visibleItemIds = new Set(visibleGroups.map((group) => group.id));
        const projectItems = project.items.filter((item) => visibleItemIds.has(item.id));
        const planned = project.rows.reduce((total, row) => total + (plans[businessPlanKey(meta, row)] ?? 0), 0);
        const forecast = project.budgetBalance - planned;
        const plannedCount = project.rows.filter((row) => (plans[businessPlanKey(meta, row)] ?? 0) > 0).length;
        return <article className={`business-plan-project ${forecast < 0 ? "over-plan" : ""}`} key={project.id}>
          <button className="business-plan-project-summary" onClick={() => toggleProject(project.id)} aria-expanded={expanded}>
            <div className="business-plan-group-title"><span>세부사업</span><h3>{project.projectName}</h3><small>세부항목 {project.items.length}개 · 산출내역 {project.rows.length}건 · 계획 {plannedCount}건 입력</small></div>
            <div className="business-plan-group-metrics"><span><small>현재 사용 가능</small><strong>{formatWon(project.budgetBalance)}</strong></span><span><small>앞으로 사용할 예정</small><strong>{formatWon(planned)}</strong></span><span className="forecast"><small>예상 잔액</small><ForecastAmount value={forecast} showWarning /></span></div>
            <span className="business-item-expand">{expanded ? "세부항목 접기" : `세부항목 ${projectItems.length}개 보기`}<ChevronDown className={expanded ? "rotated" : ""} size={17} /></span>
          </button>
          {expanded && <div className="business-plan-project-items">{projectItems.map((item) => renderPlanItem(item, true))}{projectItems.length === 0 && <EmptyState text="조건에 맞는 세부항목이 없습니다." />}</div>}
        </article>;
      })}{visibleProjects.length === 0 && <EmptyState text="조건에 맞는 세부사업이 없습니다." />}</div> : viewMode === "item" ? <div className="business-plan-groups">{visibleGroups.map((group) => renderPlanItem(group))}{visibleGroups.length === 0 && <EmptyState text="조건에 맞는 세부항목이 없습니다." />}</div> : <>
        <div className="business-plan-list">{visibleRows.slice(0, shown).map((row) => <BusinessPlanRow key={row.id} row={row} meta={meta} plans={plans} updatePlan={updatePlan} />)}{visibleRows.length === 0 && <EmptyState text="조건에 맞는 집행 계획이 없습니다." />}</div>
        {shown < visibleRows.length && <button className="button secondary full load-more" onClick={() => setShown((value) => value + 30)}>산출내역 더 보기 · {visibleRows.length - shown}건 남음</button>}
      </>}
    </section>
  </div>;
}

function BusinessPlanRow({ row, meta, plans, updatePlan }: { row: BusinessCardRow; meta: BusinessCardMeta; plans: Record<string, number>; updatePlan: (row: BusinessCardRow, value: string) => void }) {
  const plan = plans[businessPlanKey(meta, row)] ?? 0;
  const forecast = row.budgetBalance - plan;
  return <article className={forecast < 0 ? "over-plan" : ""}><div><span>{row.projectName} · {row.itemName}</span><strong>{row.calculation}</strong><small>{row.costName}</small></div><div className="plan-balance"><small>현재 사용 가능</small><strong>{formatWon(row.budgetBalance)}</strong></div><label><span>앞으로 사용할 예정</span><div className="won-input"><input inputMode="numeric" value={plan ? plan.toLocaleString("ko-KR") : ""} onChange={(event) => updatePlan(row, event.target.value)} placeholder="0" aria-label={`${row.calculation} 앞으로 사용할 예정 금액`} /><span>원</span></div></label><div className="plan-balance forecast"><small>예상 잔액</small><ForecastAmount value={forecast} showWarning /></div>{plan > 0 && <button className="icon-button" onClick={() => updatePlan(row, "")} aria-label={`${row.calculation} 계획 삭제`}><Trash2 size={17} /></button>}</article>;
}

function OverviewTab({ rows, meta, fundFilter }: { rows: BudgetRow[]; meta: FileMeta; fundFilter: FundFilter }) {
  const [policySort, setPolicySort] = useState<SchoolSort>("uncommitted-desc");
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [level, setLevel] = useState<SchoolHierarchyLevel>("policy");
  const [schoolSort, setSchoolSort] = useState<SchoolSort>("uncommitted-desc");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<{ level: SchoolHierarchyLevel; id: string; label: string } | null>(null);
  const [hierarchyFlash, setHierarchyFlash] = useState(false);
  const availableLevels = useMemo(() => ({
    policy: rows.some((row) => Boolean(row.policyName)),
    unit: rows.some((row) => Boolean(row.unitName)),
    project: rows.some((row) => Boolean(row.projectName)),
    item: rows.some((row) => Boolean(row.itemName)),
  }), [rows]);

  useEffect(() => {
    if (availableLevels[level]) return;
    const fallback = (["policy", "unit", "project", "item"] as SchoolHierarchyLevel[]).find((candidate) => availableLevels[candidate]);
    if (fallback) { setLevel(fallback); setScope(null); }
  }, [availableLevels, level]);

  const totals = useMemo(() => ({
    budget: sum(rows, "budget"),
    obligation: sum(rows, "obligation"),
    paid: sum(rows, "paid"),
    carryover: sum(rows, "carryover"),
  }), [rows]);
  const pending = totals.obligation - totals.paid;
  const uncommitted = totals.budget - totals.obligation;
  const obligationRate = totals.budget ? (totals.obligation / totals.budget) * 100 : 0;
  const spendingRate = totals.budget ? (totals.paid / totals.budget) * 100 : 0;
  const policyGroups = useMemo(() => availableLevels.policy ? sortSchoolGroups(groupSchoolRows(rows, "policy"), policySort) : [], [rows, policySort, availableLevels.policy]);
  const projectGroups = useMemo(() => groupSchoolRows(rows, "project"), [rows]);
  const pendingTop = useMemo(() => [...projectGroups].filter((group) => group.pending > 0).sort((a, b) => b.pending - a.pending).slice(0, 5), [projectGroups]);
  const uncommittedTop = useMemo(() => [...projectGroups].filter((group) => group.uncommitted > 0).sort((a, b) => b.uncommitted - a.uncommitted).slice(0, 5), [projectGroups]);
  const scopedRows = useMemo(() => scope ? rows.filter((row) => schoolHierarchyId(row, scope.level) === scope.id) : rows, [rows, scope]);
  const hierarchyGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    const groups = groupSchoolRows(scopedRows, level).filter((group) => !query || `${group.label} ${group.parentLabel}`.toLocaleLowerCase("ko-KR").includes(query));
    return sortSchoolGroups(groups, schoolSort);
  }, [scopedRows, level, schoolSort, search]);
  const selectedPolicy = selectedPolicyId ? policyGroups.find((group) => group.id === selectedPolicyId) ?? null : null;

  const setHierarchyLevel = (next: SchoolHierarchyLevel) => {
    if (!availableLevels[next]) return;
    setLevel(next);
    setScope(null);
    setSearch("");
  };
  const nextHierarchyLevel = (current: SchoolHierarchyLevel): SchoolHierarchyLevel | null => current === "policy" ? "unit" : current === "unit" ? "project" : current === "project" ? "item" : null;
  const hasLevelData = (group: SchoolAnalysisGroup, target: SchoolHierarchyLevel) => group.rows.some((row) => {
    if (target === "policy") return Boolean(row.policyName);
    if (target === "unit") return Boolean(row.unitName);
    if (target === "project") return Boolean(row.projectName);
    return Boolean(row.itemName);
  });
  const flashHierarchy = () => {
    setHierarchyFlash(true);
    window.setTimeout(() => setHierarchyFlash(false), 1100);
  };
  const navigateToSchoolGroup = (group: SchoolAnalysisGroup) => {
    const next = nextHierarchyLevel(group.level);
    setSchoolSort("uncommitted-desc");
    setSelectedPolicyId(null);
    if (next && availableLevels[next] && hasLevelData(group, next)) {
      setScope({ level: group.level, id: group.id, label: group.label });
      setLevel(next);
      setSearch("");
    } else {
      setScope(null);
      setLevel(group.level);
      setSearch(group.label);
    }
    flashHierarchy();
    requestAnimationFrame(() => document.getElementById("school-hierarchy")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const drillDown = (group: SchoolAnalysisGroup) => {
    const next = nextHierarchyLevel(group.level);
    if (!next || !availableLevels[next] || !hasLevelData(group, next)) return;
    setScope({ level: group.level, id: group.id, label: group.label });
    setLevel(next);
    setSearch("");
  };
  const openPolicyDetail = (group: SchoolAnalysisGroup) => navigateToSchoolGroup(group);
  const hierarchyLevelName = level === "policy" ? "정책사업" : level === "unit" ? "단위사업" : level === "project" ? "세부사업" : "세부항목";

  return <section className="page-content school-overview-v6">
    <section className="school-overview-lead balance-reading-lead">
      <div className="school-overview-lead-head"><div className="school-overview-lead-copy"><span className="section-kicker">학교 전체 분석</span><h1>학교 전체 예산 현황</h1><p>지금 얼마가 남았고, 얼마나 사용 결정됐는지 먼저 보여드려요.</p></div><div className="school-data-basis"><CalendarDays size={15} /><span><strong>{meta.year}회계연도 · 데이터 기준 {dateLabel(meta.executionDate)}</strong><small>102-2 · {meta.rowCount.toLocaleString("ko-KR")}개 산출내역</small></span></div></div>
      <div className="school-balance-hero">
        <article className={`school-balance-primary ${uncommitted < 0 ? "negative" : ""}`}><span>현재 잔액</span><strong>{formatKpiWon(uncommitted)}</strong><small>전체 예산에서 사용 결정액을 뺀 금액</small><em>{formatWon(uncommitted)}</em></article>
        <div className="school-balance-support">
          <article className="school-use-rate"><div><span>사용 결정률</span><strong>{formatPercent(obligationRate)}</strong></div><div className="school-use-progress" role="img" aria-label={`사용 결정률 ${formatPercent(obligationRate)}`}><i style={{ width: `${Math.max(0, Math.min(100, obligationRate))}%` }} /></div><small>원인행위 기준 · 사용 결정 {formatReadableWon(totals.obligation)}</small></article>
          <article><span>전체 예산</span><strong>{formatKpiWon(totals.budget)}</strong><small>{formatWon(totals.budget)}</small></article>
          <article><span>실제 지출</span><strong>{formatKpiWon(totals.paid)}</strong><small>지출률 {formatPercent(spendingRate)}</small></article>
        </div>
      </div>
    </section>

    <section className="school-flow-section school-flow-secondary">
      <div className="section-heading"><span className="section-kicker">상세 흐름</span><h2>현재 예산은 이렇게 나뉘어 있어요</h2><p>지급 완료 · 지급 대기 · 현재 잔액의 구성을 확인합니다.</p></div>
      <SchoolFlowBar budget={totals.budget} paid={totals.paid} pending={pending} uncommitted={uncommitted} />
      {totals.carryover > 0 && <p className="carryover-note">102-2의 다음연도 이월액 {formatReadableWon(totals.carryover)}도 별도 집계되어 있습니다.</p>}
    </section>

    {availableLevels.policy && <section className="policy-flow-section budget-reading-section">
      <div className="section-heading split-heading"><div><span className="section-kicker">잔액 비교</span><h2>정책사업별 예산 현황</h2><p>얼마가 남았고, 얼마나 사용 결정됐는지 비교합니다.</p></div><label className="school-sort-field">정렬<select value={policySort} onChange={(event) => setPolicySort(event.target.value as SchoolSort)}><option value="uncommitted-desc">현재 잔액 많은 순</option><option value="uncommitted-asc">현재 잔액 적은 순</option><option value="obligation-rate-desc">사용 결정률 높은 순</option><option value="obligation-rate-asc">사용 결정률 낮은 순</option><option value="budget-desc">전체 예산 큰 순</option><option value="name-asc">정책사업명 가나다순</option></select></label></div>
      <div className="policy-flow-list budget-reading-list">{policyGroups.map((group) => <PolicyFlowRow key={group.id} group={group} selected={selectedPolicyId === group.id} onSelect={() => setSelectedPolicyId((current) => current === group.id ? null : group.id)} />)}</div>
      {selectedPolicy && <div className="policy-detail-panel balance-first-detail"><div className="policy-detail-identity"><span>선택한 정책사업</span><strong>{selectedPolicy.label}</strong><small>현재 잔액</small><b className={selectedPolicy.uncommitted < 0 ? "negative-value" : ""}>{formatReadableWon(selectedPolicy.uncommitted)}</b></div><dl><div><dt>전체 예산</dt><dd>{formatReadableWon(selectedPolicy.budget)}</dd><small>예산현액</small></div><div className="committed"><dt>사용 결정</dt><dd>{formatReadableWon(selectedPolicy.obligation)}</dd><small>{formatPercent(selectedPolicy.obligationRate)}</small></div><div className="paid"><dt>실제 지출</dt><dd>{formatReadableWon(selectedPolicy.paid)}</dd><small>{formatPercent(selectedPolicy.spendingRate)}</small></div><div className="pending"><dt>지급 대기</dt><dd>{formatReadableWon(selectedPolicy.pending)}</dd><small>원인행위 후 미지급</small></div></dl><button className="button secondary compact" onClick={() => openPolicyDetail(selectedPolicy)}>이 정책사업 상세보기<ChevronRight size={15} /></button></div>}
    </section>}

    <section className="school-check-section"><div className="section-heading"><h2>확인해 볼 예산</h2><p>잔액이 크거나 지급을 기다리는 사업을 따로 확인할 수 있어요.</p></div><div className="school-check-grid"><SchoolCheckList title="지급 대기 금액이 큰 사업" description="사용 결정은 되었지만 아직 실제 지급되지 않은 금액" groups={pendingTop} valueKey="pending" onOpen={navigateToSchoolGroup} /><SchoolCheckList title="현재 잔액이 큰 사업" description="아직 사용 결정되지 않아 추가로 사용할 수 있는 금액" groups={uncommittedTop} valueKey="uncommitted" onOpen={navigateToSchoolGroup} /></div></section>

    <section className={`school-hierarchy-section ${hierarchyFlash ? "focus-flash" : ""}`} id="school-hierarchy">
      <div className="section-heading split-heading"><div><h2>예산을 원하는 단위로 묶어보기</h2><p>{scope ? `${scope.label}의 ${hierarchyLevelName}을 보고 있습니다.` : "현재 잔액과 사용 결정률을 같은 기준으로 비교합니다."}</p></div>{scope && <button className="text-button" onClick={() => { setScope(null); setLevel("policy"); setSearch(""); }}><X size={15} />전체로 돌아가기</button>}</div>
      <div className="school-hierarchy-view-head"><div className="school-hierarchy-tabs" role="tablist" aria-label="학교 전체 분석 단위"><button disabled={!availableLevels.policy} className={level === "policy" ? "active" : ""} onClick={() => setHierarchyLevel("policy")}>정책사업</button><button disabled={!availableLevels.unit} className={level === "unit" ? "active" : ""} onClick={() => setHierarchyLevel("unit")}>단위사업</button><button disabled={!availableLevels.project} className={level === "project" ? "active" : ""} onClick={() => setHierarchyLevel("project")}>세부사업</button><button disabled={!availableLevels.item} className={level === "item" ? "active" : ""} onClick={() => setHierarchyLevel("item")}>세부항목</button></div><span className="school-hierarchy-view-count">{fundFilter === "all" ? "전체 사업" : fundFilter === "school" ? "학교운영비" : fundFilter === "purpose" ? "목적사업비" : "수익자부담"} · <strong>산출내역 {rows.length.toLocaleString("ko-KR")}건 → {hierarchyLevelName} {hierarchyGroups.length.toLocaleString("ko-KR")}개</strong></span></div>
      <div className="school-hierarchy-toolbar"><label className="school-search"><SearchCheck size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="사업명 검색" aria-label="학교 전체 사업명 검색" /></label><label className="school-sort-field">정렬<select value={schoolSort} onChange={(event) => setSchoolSort(event.target.value as SchoolSort)}><option value="uncommitted-desc">현재 잔액 많은 순</option><option value="uncommitted-asc">현재 잔액 적은 순</option><option value="obligation-rate-desc">사용 결정률 높은 순</option><option value="obligation-rate-asc">사용 결정률 낮은 순</option><option value="budget-desc">전체 예산 큰 순</option><option value="name-asc">이름 가나다순</option></select></label></div>
      <SchoolHierarchyList groups={hierarchyGroups} onDrill={drillDown} />
      {!hierarchyGroups.length && <EmptyState text="해당 조건의 사업이 없습니다." />}
    </section>
  </section>;
}

function SchoolKpiCard({ title, term, value, tone }: { title: string; term: string; value: number; tone: "blue" | "slate" | "navy" | "pending" }) {
  return <article className={`school-kpi-card tone-${tone}`}><span>{title}</span><strong>{formatKpiWon(value)}</strong><small>{term}</small><em>{formatWon(value)}</em></article>;
}

function SchoolFlowBar({ budget, paid, pending, uncommitted }: { budget: number; paid: number; pending: number; uncommitted: number }) {
  const denominator = Math.max(Math.abs(budget), 1);
  const paidWidth = Math.max(0, Math.min(100, (paid / denominator) * 100));
  const pendingWidth = Math.max(0, Math.min(100, (pending / denominator) * 100));
  const uncommittedWidth = Math.max(0, Math.min(100, (uncommitted / denominator) * 100));
  return <div className="school-flow-wrap"><div className="school-flow-summary"><span><i className="flow-paid" />지급 완료 <b>{formatPercent(budget ? (paid / budget) * 100 : 0)}</b></span><span><i className="flow-pending" />지급 대기 <b>{formatPercent(budget ? (pending / budget) * 100 : 0)}</b></span><span><i className="flow-uncommitted" />현재 잔액 <b>{formatPercent(budget ? (uncommitted / budget) * 100 : 0)}</b></span></div><div className="school-flow-bar" role="img" aria-label={`지급 완료 ${formatReadableWon(paid)}, 지급 대기 ${formatReadableWon(pending)}, 현재 잔액 ${formatReadableWon(uncommitted)}`}><span className="flow-paid" style={{ width: `${paidWidth}%` }} /><span className="flow-pending" style={{ width: `${pendingWidth}%` }} /><span className="flow-uncommitted" style={{ width: `${uncommittedWidth}%` }} /></div><div className="school-flow-legend"><div><i className="flow-paid" /><span>지급 완료</span><strong>{formatCompactWon(paid)}</strong><small>{formatPercent(budget ? (paid / budget) * 100 : 0)}</small></div><div><i className="flow-pending" /><span>지급 대기</span><strong>{formatCompactWon(pending)}</strong><small>{formatPercent(budget ? (pending / budget) * 100 : 0)}</small></div><div><i className="flow-uncommitted" /><span>현재 잔액</span><strong>{formatCompactWon(uncommitted)}</strong><small>{formatPercent(budget ? (uncommitted / budget) * 100 : 0)}</small></div></div></div>;
}

function PolicyFlowRow({ group, selected, onSelect }: { group: SchoolAnalysisGroup; selected: boolean; onSelect: () => void }) {
  const useRate = Math.max(0, Math.min(100, group.obligationRate));
  const balanceRate = group.budget ? (group.uncommitted / group.budget) * 100 : 0;
  return <button className={`policy-flow-row budget-reading-row ${selected ? "selected" : ""}`} onClick={onSelect} aria-expanded={selected} aria-label={`${group.label}, 현재 잔액 ${formatReadableWon(group.uncommitted)}, 사용 결정률 ${formatPercent(group.obligationRate)}`}><span className="policy-reading-head"><span className="policy-flow-name"><strong>{group.label}</strong>{group.parentLabel && <small>{group.parentLabel}</small>}</span><span className={`policy-balance-value ${group.uncommitted < 0 ? "negative" : ""}`}><small>현재 잔액</small><strong>{formatCompactWon(group.uncommitted)}</strong><em>{formatPercent(balanceRate)} 남음</em></span></span><span className="policy-flow-visual"><span className="budget-reading-rate-head"><span>사용 결정 <b>{formatPercent(group.obligationRate)}</b></span><small>실제 지출 {formatPercent(group.spendingRate)}</small></span><span className="policy-flow-scale"><span className="policy-flow-track full"><i className="policy-flow-spend" style={{ width: `${useRate}%` }} /></span></span><span className="policy-flow-amounts"><small>전체 예산 <b>{formatCompactWon(group.budget)}</b></small><small>사용 결정 <b>{formatCompactWon(group.obligation)}</b></small><small>실제 지출 <b>{formatCompactWon(group.paid)}</b></small></span></span><ChevronDown className={selected ? "rotated" : ""} size={16} /></button>;
}

function SchoolCheckList({ title, description, groups, valueKey, onOpen }: { title: string; description: string; groups: SchoolAnalysisGroup[]; valueKey: "pending" | "uncommitted"; onOpen: (group: SchoolAnalysisGroup) => void }) {
  return <article className="school-check-card"><div><strong>{title}</strong><p>{description}</p></div>{groups.length ? <ol>{groups.map((group) => <li key={group.id}><button className="school-check-row" onClick={() => onOpen(group)} aria-label={`${group.label} 세부내역 보기`}><span className="school-check-name"><b>{group.label}</b><small>{group.parentLabel}</small></span><span className="school-check-value"><strong>{formatReadableWon(group[valueKey])}</strong><em>세부내역 보기<ChevronRight size={13} /></em></span></button></li>)}</ol> : <div className="school-check-empty">해당 금액이 있는 사업이 없습니다.</div>}</article>;
}

function SchoolHierarchyList({ groups, onDrill }: { groups: SchoolAnalysisGroup[]; onDrill: (group: SchoolAnalysisGroup) => void }) {
  const nextLabel = (level: SchoolHierarchyLevel) => level === "policy" ? "단위사업 보기" : level === "unit" ? "세부사업 보기" : level === "project" ? "세부항목 보기" : null;
  return <div className="school-reading-list">{groups.map((group) => {
    const drillLabel = nextLabel(group.level);
    const useRate = Math.max(0, Math.min(100, group.obligationRate));
    return <article key={group.id} className={`school-reading-row ${group.uncommitted < 0 ? "negative" : ""}`}><div className="school-reading-main"><div className="school-reading-head"><div className="school-reading-name"><strong>{group.label}</strong>{group.parentLabel && <small>{group.parentLabel}</small>}</div><div className="school-reading-balance"><small>현재 잔액</small><strong>{formatReadableWon(group.uncommitted)}</strong>{group.pending > 0 && <em>지급 대기 {formatCompactWon(group.pending)}</em>}</div></div><div className="school-reading-progress"><div className="school-reading-rate"><span>사용 결정 <b>{formatPercent(group.obligationRate)}</b></span><small>실제 지출 {formatPercent(group.spendingRate)}</small></div><div className="school-reading-track" role="img" aria-label={`${group.label} 사용 결정률 ${formatPercent(group.obligationRate)}`}><i style={{ width: `${useRate}%` }} /></div><div className="school-reading-basis"><span>전체 예산 <b>{formatCompactWon(group.budget)}</b></span><span>사용 결정 <b>{formatCompactWon(group.obligation)}</b></span><span>실제 지출 <b>{formatCompactWon(group.paid)}</b></span></div></div></div>{drillLabel ? <button className="hierarchy-drill school-reading-drill" onClick={() => onDrill(group)} aria-label={`${group.label} ${drillLabel}`}>{drillLabel}<ChevronRight size={14} /></button> : <span className="school-reading-end" aria-hidden="true" />}</article>;
  })}</div>;
}

function ProgressStep({ title, label, rate, primaryLabel, primaryValue, remainderLabel, remainderValue, tone }: { title: string; label: string; rate: number; primaryLabel: string; primaryValue: number; remainderLabel: string; remainderValue: number; tone: "blue" | "violet" }) {
  const safeRate = Math.max(0, Math.min(100, rate));
  return <article className="progress-step"><div className="progress-step-head"><div><span>{title}</span><strong>{label}</strong></div><b>{formatPercent(rate)}</b></div><div className="simple-progress" role="img" aria-label={`${label} ${formatPercent(rate)}`}><span className={tone} style={{ width: `${safeRate}%` }} /></div><div className="progress-step-values"><span><small>{primaryLabel}</small><strong>{formatCompactWon(primaryValue)}</strong></span><span><small>{remainderLabel}</small><strong>{formatCompactWon(remainderValue)}</strong></span></div></article>;
}

function AvailableTopTen({ groups, onSelect }: { groups: BudgetGroup[]; onSelect: (id: string) => void }) {
  if (!groups.length) return null;
  const max = Math.max(...groups.map((group) => group.available), 1);
  return <section className="top-ten-section"><div className="section-heading"><span className="section-kicker">잔액 비교</span><h2>사업별 사용 가능액 TOP 10</h2><p>막대를 누르면 아래 상세표에서 해당 사업을 확인할 수 있습니다.</p></div><div className="top-ten-list">{groups.map((group, index) => <button key={group.id} className="top-ten-row" onClick={() => onSelect(group.id)} title={`${group.projectName} · ${formatWon(group.available)}`}><span className="top-rank">{index + 1}</span><strong>{group.projectName}</strong><span className="top-bar-track"><i style={{ width: `${Math.max(3, (group.available / max) * 100)}%` }} /></span><b>{formatCompactWon(group.available)}</b></button>)}</div></section>;
}

function PromotionTab({ meta, groups, totals, plans, forecast, plannedTotal, recheckCount, selectedId, selected, select, panelOpen, closePanel, amount, setAmount, month, setMonth, memo, setMemo, save, remove, currentAmount, selectedForecast }: { meta: FileMeta; groups: PromotionGroup[]; totals: { budget: number; obligation: number; paid: number; available: number }; plans: Record<string, Plan>; forecast: number; plannedTotal: number; recheckCount: number; selectedId: string | null; selected: PromotionDetail | null; select: (detail: PromotionDetail) => void; panelOpen: boolean; closePanel: () => void; amount: string; setAmount: (value: string) => void; month: string; setMonth: (value: string) => void; memo: string; setMemo: (value: string) => void; save: () => void; remove: () => void; currentAmount: number; selectedForecast: number }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [onlyOverrun, setOnlyOverrun] = useState(false);
  const [chartOpen, setChartOpen] = useState(true);
  const overrunRows = useMemo(() => groups.flatMap((group) => group.rows.filter((row) => row.available < 0)), [groups]);
  const overrunAmount = Math.abs(overrunRows.reduce((total, row) => total + row.available, 0));
  const visibleGroups = onlyOverrun ? groups.filter((group) => group.rows.some((row) => row.available < 0)) : groups;
  const selectedPlan = selected ? plans[planStorageKey(meta, selected)] : undefined;
  const selectedStale = Boolean(selectedPlan && selectedPlan.reviewedBalance !== undefined && selected && Math.abs(selectedPlan.reviewedBalance - selected.available) >= 1);
  const toggleGroup = (id: string) => setExpandedGroups((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const revealOverruns = () => {
    const ids = groups.filter((group) => group.rows.some((row) => row.available < 0)).map((group) => group.id);
    setOnlyOverrun(true);
    setExpandedGroups(new Set(ids));
  };
  const revealGroup = (id: string) => {
    setOnlyOverrun(false);
    setExpandedGroups((current) => new Set(current).add(id));
  };

  return <section className="page-content">
    <div className="stat-grid promotion-stats">
      <article className={`stat-card primary-stat ${forecast < 0 ? "negative" : ""}`}><span className="stat-label">연말 예상잔액</span><strong>{formatCompactWon(forecast)}</strong><span className="stat-detail">입력한 집행예정 {formatCompactWon(plannedTotal)} 반영</span></article>
      <article className="stat-card"><span className="stat-label">현재 원인행위 기준 잔액</span><strong className={totals.available < 0 ? "negative-value" : ""}>{formatCompactWon(totals.available)}</strong><span className="stat-detail">원인행위율 {formatPercent(totals.budget ? (totals.obligation / totals.budget) * 100 : 0)}</span></article>
      <article className="stat-card"><span className="stat-label">업무추진비 예산</span><strong>{formatCompactWon(totals.budget)}</strong><span className="stat-detail">목코드 B20 · {groups.reduce((count, group) => count + promotionDetails(group).length, 0)}개 산출내역</span></article>
    </div>
    {overrunRows.length > 0 && <button className="overrun-alert" onClick={revealOverruns}><span className="overrun-alert-icon"><AlertCircle size={21} /></span><span><strong>업무추진비 초과 산출내역 {overrunRows.length}건</strong><small>마이너스 잔액 합계 {formatWon(overrunAmount)} · 총잔액이 남아 있어도 개별 초과 항목을 확인하세요.</small></span><b>바로 확인</b><ChevronRight size={18} /></button>}
    {recheckCount > 0 && <div className="promotion-recheck-alert"><RefreshCw size={18} /><span><strong>업무추진비 계획 {recheckCount}건 재확인 필요</strong><small>새 파일에서 잔액이 달라졌거나 기존 합계 계획을 산출내역별로 나눠야 합니다.</small></span></div>}
    <div className="promotion-layout"><section className="promotion-list-section">
      <div className="section-heading split-heading"><div><span className="section-kicker">회계말 계획</span><h2>항목별 업무추진비</h2><p>항목을 펼쳐 산출내역별 집행예정액을 입력하세요. 위 금액은 자동으로 합산됩니다.</p></div><div className="promotion-controls"><button className={`sort-chip chart-toggle ${chartOpen ? "active" : ""}`} onClick={() => setChartOpen((current) => !current)} aria-expanded={chartOpen}><BarChart3 size={15} />{chartOpen ? "잔액 그래프 닫기" : "잔액 그래프로 보기"}<ChevronDown className={chartOpen ? "rotated" : ""} size={15} /></button><button className={`sort-chip filter-chip ${onlyOverrun ? "active" : ""}`} onClick={() => setOnlyOverrun((current) => !current)}>{onlyOverrun ? <><X size={14} />초과 항목만</> : "초과 항목 먼저"}</button></div></div>
      {chartOpen && <section className="promotion-chart-panel"><div className="promotion-chart-heading"><div><span className="section-kicker">0원 기준 비교</span><h3>산출내역별 잔액</h3></div><p>왼쪽 빨강은 예산 초과, 오른쪽 파랑은 남은 금액입니다.</p></div><PromotionBalanceChart groups={groups} onSelect={revealGroup} /></section>}
      <div className="promotion-basis-note"><Info size={17} /><span><strong>원인행위 기준입니다.</strong> 102-2의 원인행위불용예상액을 사용하며, 지급 전 원인행위액은 신규 집행 가능액에 포함하지 않습니다.</span></div>
      <div className="promotion-table-wrap"><table className="data-table promotion-table"><thead><tr><th>세부항목</th><th>예산</th><th>원인행위 잔액</th><th>계획 합계</th><th>예상잔액</th><th>상태</th><th>계획</th></tr></thead><tbody>{visibleGroups.map((group) => <PromotionGroupRows key={group.id} meta={meta} group={group} plans={plans} selectedId={selectedId} expanded={expandedGroups.has(group.id)} toggle={() => toggleGroup(group.id)} select={select} />)}</tbody></table>{!visibleGroups.length && <EmptyState text="해당 조건의 업무추진비가 없습니다." />}</div>
    </section>
      {selected && <><button className={`sheet-backdrop ${panelOpen ? "visible" : ""}`} aria-label="집행계획 입력 닫기" onClick={closePanel} /><aside className={`plan-panel ${panelOpen ? "mobile-open" : ""}`}><div className="plan-panel-head"><div><span className="section-kicker">{selectedPlan ? "산출내역 계획 수정" : "산출내역 계획 입력"}</span><h2>{selected.calculation}</h2><p>{selected.itemName} · {selected.projectName}</p></div><button className="icon-button mobile-close" aria-label="닫기" onClick={closePanel}><X size={19} /></button></div>{selectedStale && <div className="plan-stale-note"><RefreshCw size={16} /><span><strong>잔액 변경 · 계획 재확인 필요</strong><small>저장 당시 {formatWon(selectedPlan?.reviewedBalance ?? 0)} → 현재 {formatWon(selected.available)}</small></span></div>}<div className={`selected-balance ${selected.available < 0 ? "negative" : ""}`}><span><b>현재 잔액</b><small>원인행위 기준</small></span><strong>{formatWon(selected.available)}</strong></div><label className="form-field"><span>앞으로 사용할 예정</span><div className="won-input"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /><span>원</span></div><small>{currentAmount ? koreanMoney(currentAmount) : selectedPlan ? "0원으로 수정하거나 계획을 삭제할 수 있습니다." : "금액을 입력해주세요."}</small></label>{currentAmount > 0 && selected.available < 0 && <div className="inline-plan-warning"><AlertCircle size={16} /><span>이미 초과된 항목입니다. 추가 계획을 입력하면 초과액이 더 커집니다.</span></div>}{selected.available >= 0 && currentAmount > selected.available && <div className="inline-plan-warning"><AlertCircle size={16} /><span>신규 집행 가능액보다 <strong>{formatWon(currentAmount - selected.available)}</strong> 큰 계획입니다.</span></div>}<label className="form-field"><span>집행 예정 시기</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option>미정</option><option>9월</option><option>10월</option><option>11월</option><option>12월</option><option>회계연도 말</option></select></label><label className="form-field"><span>메모</span><textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="예: 교직원 간담회 2회" rows={3} /></label>{currentAmount > 0 && <div className={`forecast-box ${selectedForecast < 0 ? "warning" : ""}`}><span>계획 반영 후 잔액</span><strong>{formatWon(selectedForecast)}</strong>{selectedForecast < 0 && <small>예산 범위를 벗어난 상태입니다.</small>}</div>}<div className="plan-actions"><button className="button primary full" onClick={save}>{selectedPlan ? "변경사항 저장" : "계획 반영"}</button>{selectedPlan && <button className="button delete-plan" onClick={remove}><Trash2 size={16} />계획 삭제</button>}</div><p className="local-note"><LockKeyhole size={14} />입력 내용은 이 브라우저에만 저장됩니다.</p></aside></>}
    </div>
  </section>;
}

function PromotionBalanceChart({ groups, onSelect }: { groups: PromotionGroup[]; onSelect: (id: string) => void }) {
  const chartRows = groups.flatMap((group) => group.rows.map((row, index) => ({
    groupId: group.id,
    projectName: group.projectName,
    name: row.calculation || row.costName || group.itemName,
    available: row.available,
    key: `${group.id}-${row.costCode}-${index}`,
  }))).filter((row) => row.available !== 0).sort((a, b) => Number(a.available >= 0) - Number(b.available >= 0) || Math.abs(b.available) - Math.abs(a.available));
  const max = Math.max(...chartRows.map((row) => Math.abs(row.available)), 1);
  if (!chartRows.length) return <EmptyState text="잔액이 있는 산출내역이 없습니다." />;
  return <div className="diverging-chart"><div className="diverging-axis"><span>예산 초과</span><b>0원</b><span>사용 가능</span></div><div className="diverging-scroll">{chartRows.map((row) => { const width = Math.max(2, (Math.abs(row.available) / max) * 50); const negative = row.available < 0; return <button key={row.key} className={`diverging-row ${negative ? "negative" : "positive"}`} onClick={() => onSelect(row.groupId)} title={`${row.projectName} · ${row.name}`}><span className="diverging-name"><strong>{row.name}</strong><small>{row.projectName}</small></span><span className="diverging-track"><i className="zero-line" />{negative ? <i className="negative-bar" style={{ width: `${width}%` }} /> : <i className="positive-bar" style={{ width: `${width}%` }} />}</span><b>{negative ? "▼ " : ""}{formatCompactWon(row.available)}</b></button>; })}</div></div>;
}

function PromotionGroupRows({ meta, group, plans, selectedId, expanded, toggle, select }: { meta: FileMeta; group: PromotionGroup; plans: Record<string, Plan>; selectedId: string | null; expanded: boolean; toggle: () => void; select: (detail: PromotionDetail) => void }) {
  const details = promotionDetails(group);
  const groupPlans = promotionPlansForGroup(meta, group, plans);
  const planned = groupPlans.reduce((total, plan) => total + plan.amount, 0);
  const rowForecast = group.available - planned;
  const overrunCount = group.rows.filter((row) => row.available < 0).length;
  const detailPlanCount = details.filter((detail) => Boolean(plans[planStorageKey(meta, detail)])).length;
  const legacy = plans[legacyPlanStorageKey(meta, group)];
  const legacyNeedsSplit = Boolean(legacy && details.length > 1 && detailPlanCount === 0);
  const staleCount = details.filter((detail) => { const plan = plans[planStorageKey(meta, detail)]; return Boolean(plan && plan.reviewedBalance !== undefined && Math.abs(plan.reviewedBalance - detail.available) >= 1); }).length;
  const planStatus = overrunCount ? { label: `초과 ${overrunCount}건`, tone: "danger" } : legacyNeedsSplit || staleCount ? { label: "재확인 필요", tone: "warning" } : rowForecast < 0 ? { label: "계획 후 부족", tone: "warning" } : groupPlans.length ? { label: "계획 반영", tone: "normal" } : group.obligation === 0 ? { label: "미집행", tone: "attention" } : { label: "계획 확인", tone: "muted" };
  return <>
    <tr className={`${details.some((detail) => detail.id === selectedId) ? "selected-row" : ""} ${overrunCount ? "has-overrun" : ""}`} onClick={toggle}>
      <td><button className="row-title" aria-expanded={expanded} onClick={(event) => { event.stopPropagation(); toggle(); }}><ChevronRight className={expanded ? "rotated" : ""} size={18} /><span><strong>{group.itemName}</strong><small>{group.projectName} · 산출내역 {group.rows.length}건</small></span></button></td>
      <td>{formatWon(group.budget)}</td>
      <td className={group.available < 0 ? "negative-value" : "emphasis-cell"}>{formatWon(group.available)}</td>
      <td>{groupPlans.length ? formatWon(planned) : "—"}</td>
      <td className={rowForecast < 0 ? "negative-value" : ""}>{formatWon(rowForecast)}</td>
      <td><span className={`status-badge ${planStatus.tone}`}>{planStatus.label}</span></td>
      <td><button className={`plan-action ${groupPlans.length ? "has-plan" : ""}`} onClick={(event) => { event.stopPropagation(); if (!expanded) toggle(); }}>{expanded ? "아래에서 입력" : "산출내역 보기"}</button></td>
    </tr>
    {expanded && <tr className="promotion-detail-row"><td colSpan={7}><div className="calculation-detail"><div className="calculation-detail-head"><strong>산출내역별 집행계획</strong><span>잔액이 1,000원 이하인 항목도 빠짐없이 표시합니다.</span></div>{legacyNeedsSplit && <div className="legacy-promotion-note"><AlertCircle size={17} /><span><strong>이전 합계 계획 {formatWon(legacy?.amount ?? 0)}을 산출내역별로 나눠주세요.</strong><small>새 계획을 하나라도 입력하면 이전 합계는 중복 반영되지 않습니다.</small></span></div>}<div className="promotion-detail-grid">{details.map((detail) => { const plan = plans[planStorageKey(meta, detail)]; const stale = Boolean(plan && plan.reviewedBalance !== undefined && Math.abs(plan.reviewedBalance - detail.available) >= 1); const expected = detail.available - (plan?.amount ?? 0); const status = detail.available < 0 ? { label: "예산 초과", tone: "danger" } : stale ? { label: "재확인 필요", tone: "warning" } : plan ? { label: "계획 반영", tone: "normal" } : { label: "계획 확인", tone: "muted" }; return <article key={detail.id} className={`promotion-detail-card ${detail.available < 0 ? "overrun" : ""} ${selectedId === detail.id ? "selected" : ""}`}><div className="promotion-detail-main"><div className="promotion-detail-card-head"><div><strong>{detail.calculation}</strong><span>{detail.costName}</span></div><span className={`status-badge ${status.tone}`}>{status.label}</span></div><div className="promotion-detail-primary"><small>현재 잔액 <em>원인행위 기준</em></small><strong className={detail.available < 0 ? "negative-value" : ""}>{formatWon(detail.available)}</strong></div></div><div className="promotion-detail-metrics"><span>전체 예산 <b>{formatWon(detail.budget)}</b></span><span>사용 결정 <b>{formatWon(detail.obligation)}</b></span></div><div className="promotion-detail-plan"><span>{plan ? <>집행예정 <b>{formatWon(plan.amount)}</b></> : <>집행계획 <b>미입력</b></>}</span>{plan && <span>계획 반영 후 <strong className={expected < 0 ? "negative-value" : ""}>{formatWon(expected)}</strong></span>}</div><button className={`plan-action detail-plan-action ${plan ? "has-plan" : ""}`} onClick={() => select(detail)}>{plan ? "계획 수정" : "계획 입력"}</button></article>; })}</div></div></td></tr>}
  </>;
}

function ClosingTab({ meta, expenseRows, expenseTotals, revenueRows, revenueMeta, inputs, plannedPromotion, plannedPromotionCount, promotionRecheckCount, plannedYearEnd, openPromotion, loading, error, dragging, setDragging, dropFile, chooseFile, changeAdditional, changeAmount, changeTransferReturn, removeTransferReturn, changeDetailPlan, clearDetailPlan, resetDetailPlans, setLegacyDecision, changeMemo, reset }: {
  meta: FileMeta;
  expenseRows: BudgetRow[];
  expenseTotals: { budget: number; obligation: number; paid: number; carryover: number; available: number };
  revenueRows: RevenueRow[];
  revenueMeta: FileMeta | null;
  inputs: ClosingInputs | null;
  plannedPromotion: number;
  plannedPromotionCount: number;
  promotionRecheckCount: number;
  plannedYearEnd: number;
  openPromotion: () => void;
  loading: boolean;
  error: string;
  dragging: boolean;
  setDragging: (dragging: boolean) => void;
  dropFile: (event: DragEvent<HTMLDivElement>) => void;
  chooseFile: () => void;
  changeAdditional: (costCode: string, value: string) => void;
  changeAmount: (field: ClosingAmountField, value: string) => void;
  changeTransferReturn: (costCode: string, patch: Partial<TransferReturnPlan>) => void;
  removeTransferReturn: (costCode: string) => void;
  changeDetailPlan: (id: string, mode: DetailSpendingMode, amount: number, balance: number) => void;
  clearDetailPlan: (id: string) => void;
  resetDetailPlans: () => void;
  setLegacyDecision: (decision: "keep" | "discard") => void;
  changeMemo: (value: string) => void;
  reset: () => void;
}) {
  const [flowDetail, setFlowDetail] = useState<string | null>(null);
  const [spendingFilter, setSpendingFilter] = useState<"all" | "unreviewed" | "partial" | "none" | "reviewed">("unreviewed");
  const [spendingSearch, setSpendingSearch] = useState("");
  const revenueGroups = useMemo(() => {
    const map = new Map<string, RevenueRow[]>();
    revenueRows.forEach((row) => map.set(row.sectionName, [...(map.get(row.sectionName) ?? []), row]));
    return [...map.entries()];
  }, [revenueRows]);
  const collected = revenueRows.reduce((total, row) => total + row.collected, 0);
  const uncollected = revenueRows.reduce((total, row) => total + row.uncollected, 0);
  const futureReceipts = revenueRows.reduce((total, row) => total + (inputs?.additionalReceipts[row.costCode] ?? 0), 0);
  const expectedRevenue = collected + futureReceipts;
  const currentBalance = collected - expenseTotals.paid;
  const pendingExpense = Math.max(0, expenseTotals.obligation - expenseTotals.paid);
  const spendingDetails = useMemo(() => groupSpendingDetails(expenseRows), [expenseRows]);
  const detailSpendingTotal = spendingDetails.reduce((total, detail) => total + effectiveDetailSpending(detail, inputs?.detailSpendingPlans[detail.id]), 0);
  const detailExpectedBalance = spendingDetails.reduce((total, detail) => total + Math.max(0, detail.available - effectiveDetailSpending(detail, inputs?.detailSpendingPlans[detail.id])), 0);
  const legacyIncluded = inputs?.legacyDecision === "keep" ? (inputs.legacyFutureSpending ?? 0) : 0;
  const extraFutureSpending = inputs?.extraFutureSpending ?? 0;
  const newFutureSpending = detailSpendingTotal + extraFutureSpending + legacyIncluded;
  const expectedExpense = expenseTotals.obligation + plannedPromotion + newFutureSpending;
  const worldSurplus = expectedRevenue - expectedExpense;
  const transferCandidates = revenueRows.filter((row) => {
    const text = `${row.sectionName} ${row.categoryName} ${row.costName}`;
    const returnableSignal = /이전수입|전입금|보조금|지원금|교부금/.test(text);
    const excludedSurplus = /순세계잉여금|이월금|전년도/.test(`${row.categoryName} ${row.costName}`);
    return returnableSignal && !excludedSurplus;
  });
  const transferRows = transferCandidates.length ? transferCandidates : [{ ...revenueRows[0], costCode: "__manual_transfer__", costName: "직접 입력 이전수입", categoryName: "201 자료에서 이전수입 항목을 찾지 못함", budget: 0, assessment: 0, collected: 0, badDebt: 0, uncollected: 0, budgetGap: 0 }];
  const transferReturnTotal = Object.values(inputs?.transferReturns ?? {}).reduce((total, plan) => total + (plan.includedInSpending ? 0 : plan.amount), 0);
  const scheduledTransferTotal = Object.values(inputs?.transferReturns ?? {}).filter((plan) => plan.schedule === "12월" || plan.schedule === "회계연도 말").reduce((total, plan) => total + plan.amount, 0);
  const otherExclusions = (inputs?.nextCarryover ?? 0) + (inputs?.returns ?? 0) + (inputs?.otherDeductions ?? 0);
  const deductions = otherExclusions + transferReturnTotal;
  const netSurplus = worldSurplus - deductions;
  const allocationBase = Math.max(expectedRevenue, 1);
  const expenseShare = Math.min(100, Math.max(0, (expectedExpense / allocationBase) * 100));
  const deductionShare = Math.min(100 - expenseShare, Math.max(0, (deductions / allocationBase) * 100));
  const surplusShare = Math.max(0, 100 - expenseShare - deductionShare);
  const deficit = Math.max(0, -netSurplus);
  const expectedUnused = expenseTotals.budget - expectedExpense - (inputs?.nextCarryover ?? 0);
  const yearEndPressure = plannedYearEnd + scheduledTransferTotal;
  const priorSurplus = revenueRows.find((row) => row.costName.includes("순세계잉여금"));
  const overBudgetRows = revenueRows.filter((row) => row.budgetGap > 0).sort((a, b) => b.budgetGap - a.budgetGap);
  const drivers = [
    ...(priorSurplus ? [`전년도 순세계잉여금이 예산보다 ${formatWon(Math.max(0, priorSurplus.budgetGap))} 많습니다.`] : []),
    ...overBudgetRows.filter((row) => !row.costName.includes("순세계잉여금")).slice(0, 2).map((row) => `${row.costName} 수입이 예산보다 ${formatWon(row.budgetGap)} 많습니다.`),
    ...(uncollected > 0 ? [`아직 수납되지 않은 징수결정액이 ${formatWon(uncollected)} 있습니다.`] : []),
    [`앞으로 새로 집행할 금액을 ${formatWon(plannedPromotion + newFutureSpending)}으로 반영했습니다.`],
    ...(transferReturnTotal > 0 ? [`이전수입 반납예정액 ${formatWon(transferReturnTotal)}을 별도로 차감했습니다.`] : ["이전수입 반납예정액을 확인해주세요."]),
    ...((inputs?.returns ?? 0) > 0 ? [`기타 반환·정산예정액 ${formatWon(inputs?.returns ?? 0)}을 차감했습니다.`] : []),
  ].slice(0, 5);
  const isReviewed = (detail: SpendingDetail) => {
    const plan = inputs?.detailSpendingPlans[detail.id];
    return Boolean(plan && Math.abs(plan.reviewedBalance - detail.available) < 1);
  };
  const reviewedCount = spendingDetails.filter(isReviewed).length;
  const unreviewedDetails = spendingDetails.filter((detail) => !isReviewed(detail));
  const unreviewedBalance = unreviewedDetails.reduce((total, detail) => total + detail.available, 0);
  const normalizedSearch = normalize(spendingSearch);
  const visibleSpendingDetails = spendingDetails.filter((detail) => {
    const plan = inputs?.detailSpendingPlans[detail.id];
    const reviewed = isReviewed(detail);
    const matchesFilter = spendingFilter === "all" || (spendingFilter === "unreviewed" && !reviewed) || (spendingFilter === "reviewed" && reviewed) || (spendingFilter === "partial" && reviewed && plan?.mode === "partial") || (spendingFilter === "none" && reviewed && plan?.mode === "none");
    const matchesSearch = !normalizedSearch || normalize(`${detail.projectName} ${detail.itemName} ${detail.costName} ${detail.calculation}`).includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });
  const spendingProjectGroups = [...visibleSpendingDetails.reduce((map, detail) => {
    const key = detail.projectCode || detail.projectName;
    map.set(key, [...(map.get(key) ?? []), detail]);
    return map;
  }, new Map<string, SpendingDetail[]>()).entries()];

  if (!revenueMeta || !inputs) return <section className="page-content closing-page"><div className="closing-empty"><div className="closing-icon"><Landmark size={28} /></div><span className="eyebrow">결산예측</span><h1>201 세입실적을 연결하면<br />연말 잉여금을 계산해요.</h1><p>현재 올린 102-2와 같은 날짜의 <strong>201 목/원가목별 세입실적</strong>을 선택해주세요.</p><div className={`closing-drop-zone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropFile}><UploadCloud size={25} /><strong>201 파일을 여기에 끌어놓으세요</strong><span>또는</span><button className="button primary closing-upload-button" onClick={chooseFile} disabled={loading}><FileSpreadsheet size={18} />{loading ? "세입실적 확인 중..." : "201 세입실적 선택"}</button><small>.xlsx · .xls</small></div>{error && <div className="error-message closing-error" role="alert"><AlertCircle size={17} />{error}</div>}<FileRouteGuide detail="자료코드 201을 선택하고, 102-2와 같은 집행일자로 내려받으세요." /><div className="equation-list"><div><span>현재 수납액</span><b>201 파일</b></div><div><span>− 예상 최종 지출액</span><b>102-2 + 집행계획</b></div><div><span>− 이월·반환 예정액</span><b>직접 조정</b></div><div className="equation-total"><span>= 예상 순세계잉여금</span><b>즉시 계산</b></div></div><div className="info-note"><Info size={17} /><span>파일은 서버로 전송되지 않고 이 브라우저에서만 분석됩니다.</span></div></div></section>;

  return <section className="page-content closing-dashboard">
    <div className="closing-title-row"><div><span className="section-kicker">회계연도 말 예상</span><h1>순세계잉여금 예측</h1><p>예산 기준값에서 실제 수입·집행계획을 조정하면 결과가 바로 바뀝니다.</p></div><button className="button secondary compact" onClick={chooseFile} disabled={loading}><RefreshCw size={15} />201 파일 교체</button></div>
    {error && <div className="error-message closing-dashboard-error" role="alert"><AlertCircle size={17} />{error}</div>}

    <section className="closing-file-status"><div className="status-check-icon"><CheckCircle2 size={20} /></div><div><strong>세입·세출 자료가 정상적으로 연결되었습니다.</strong><span>{meta.schoolName} · {meta.year}회계연도 · {dateLabel(meta.executionDate)} 기준</span></div><div className="file-status-values"><span>세입 {revenueMeta.rowCount}개 항목</span><span>예산 대사 완료</span></div></section>

    <div className="stat-grid closing-stats">
      <article className={`stat-card primary-stat ${netSurplus < 0 ? "negative" : ""}`}><span className="stat-label">예상 순세계잉여금</span><strong>{formatCompactWon(netSurplus)}</strong><span className="forecast-confidence">{reviewedCount === spendingDetails.length && promotionRecheckCount === 0 ? "확인 완료" : `잠정 예측 · 산출내역 ${reviewedCount}/${spendingDetails.length}건 확인`}</span>{promotionRecheckCount > 0 && <span className="stat-detail warning-text">업무추진비 계획 {promotionRecheckCount}건 재확인 필요</span>}</article>
      <article className="stat-card"><span className="stat-label">예상 최종 세입</span><strong>{formatCompactWon(expectedRevenue)}</strong><span className="stat-detail">현재 수납 {formatCompactWon(collected)} + 향후 예상</span></article>
      <article className="stat-card"><span className="stat-label">예상 최종 세출</span><strong>{formatCompactWon(expectedExpense)}</strong><span className="stat-detail">원인행위 + 앞으로 집행할 금액</span></article>
    </div>
    {netSurplus < 0 && <div className="closing-warning"><AlertCircle size={19} /><span><strong>예상 순세계잉여금이 마이너스입니다.</strong> 세입보다 세출·이월·반환 예정액이 많습니다.</span></div>}
    {yearEndPressure > 0 && <section className="year-end-card"><div className="year-end-icon"><CalendarDays size={20} /></div><div><span>연말 확인</span><strong>연말 반납·집행 예정 {formatCompactWon(yearEndPressure)}</strong><small>12월·회계연도 말 업무추진비 계획과 이전수입 반납예정액을 합산했습니다.</small></div></section>}

    <section className="closing-section closing-calculation"><div className="section-heading"><span className="section-kicker">순세계잉여금 예상 흐름</span><h2>지금 잔액에서 연말까지</h2><p>각 단계를 누르면 포함된 금액을 바로 확인할 수 있습니다.</p></div><div className="closing-allocation"><div className="allocation-heading"><strong>예상 세입의 연말 배분</strong><span>예상 최종 세입 {formatCompactWon(expectedRevenue)}</span></div><div className="allocation-bar" role="img" aria-label={`예상 세출 ${formatCompactWon(expectedExpense)}, 이월·반환·기타 ${formatCompactWon(deductions)}, 예상 순세계잉여금 ${formatCompactWon(netSurplus)}`}><span className="allocation-expense" style={{ width: `${expenseShare}%` }} /><span className="allocation-deduction" style={{ width: `${deductionShare}%` }} /><span className="allocation-surplus" style={{ width: `${surplusShare}%` }} /></div><div className="allocation-legend"><div><i className="expense" /><span>예상 최종 세출</span><strong>{formatCompactWon(expectedExpense)}</strong></div><div><i className="deduction" /><span>이월·반환·기타</span><strong>{formatCompactWon(deductions)}</strong></div><div><i className="surplus" /><span>예상 순세계잉여금</span><strong className={netSurplus < 0 ? "negative-value" : ""}>{formatCompactWon(netSurplus)}</strong></div></div>{deficit > 0 && <div className="allocation-deficit"><AlertCircle size={17} /><span>예상 세입보다 지출·제외액이 <strong>{formatCompactWon(deficit)}</strong> 많습니다.</span></div>}</div><div className="calculation-ladder"><ClosingFlowRow label="현재 세입·지급 잔액" value={currentBalance} detail={`현재 수납 ${formatWon(collected)} − 지급 완료 ${formatWon(expenseTotals.paid)}`} active={flowDetail === "balance"} onClick={() => setFlowDetail(flowDetail === "balance" ? null : "balance")} /><ClosingFlowRow operator="+" label="연말까지 추가 수입" value={futureReceipts} detail={`${revenueRows.filter((row) => (inputs.additionalReceipts[row.costCode] ?? 0) > 0).length}개 세입 항목`} active={flowDetail === "revenue"} onClick={() => setFlowDetail(flowDetail === "revenue" ? null : "revenue")} /><ClosingFlowRow operator={<Minus size={17} />} label="앞으로 나갈 집행예정액" value={pendingExpense + plannedPromotion + newFutureSpending} detail="지급 전 원인행위 + 산출내역별 신규 집행계획 + 업무추진비" active={flowDetail === "expense"} onClick={() => setFlowDetail(flowDetail === "expense" ? null : "expense")} /><ClosingFlowRow operator={<Minus size={17} />} label="이전수입 반납예정액" value={transferReturnTotal} detail="집행예정액에 이미 반영된 금액은 중복 차감하지 않음" tone="return" active={flowDetail === "transfer"} onClick={() => setFlowDetail(flowDetail === "transfer" ? null : "transfer")} /><ClosingFlowRow operator={<Minus size={17} />} label="이월·기타 제외액" value={otherExclusions} detail="다음연도 이월 + 기타 반환·정산 + 기타 제외" active={flowDetail === "other"} onClick={() => setFlowDetail(flowDetail === "other" ? null : "other")} /><ClosingFlowRow label="예상 순세계잉여금" value={netSurplus} total negative={netSurplus < 0} active={flowDetail === "total"} onClick={() => setFlowDetail(flowDetail === "total" ? null : "total")} /></div>{flowDetail && <div className="flow-detail-panel">{flowDetail === "balance" && <><strong>현재 세입·지급 잔액 구성</strong><span>현재 수납액 {formatWon(collected)}</span><span>현재 지급 완료 −{formatWon(expenseTotals.paid)}</span></>}{flowDetail === "revenue" && <><strong>추가 수입 구성</strong>{revenueRows.filter((row) => (inputs.additionalReceipts[row.costCode] ?? 0) > 0).map((row) => <span key={row.costCode}>{row.costName} <b>{formatWon(inputs.additionalReceipts[row.costCode])}</b></span>)}</>}{flowDetail === "expense" && <><strong>집행예정액 구성</strong><span>원인행위 후 지급 전 <b>{formatWon(pendingExpense)}</b></span><span>산출내역별 신규 집행계획 <b>{formatWon(detailSpendingTotal)}</b></span><span>업무추진비 집행계획 <b>{formatWon(plannedPromotion)}</b></span><span>산출내역에 없는 추가 집행 <b>{formatWon(extraFutureSpending + legacyIncluded)}</b></span></>}{flowDetail === "transfer" && <><strong>이전수입 반납 구성</strong>{Object.entries(inputs.transferReturns).filter(([, plan]) => plan.amount > 0).map(([code, plan]) => <span key={code}>{transferRows.find((row) => row.costCode === code)?.costName ?? "이전수입"} <b>{plan.includedInSpending ? "집행계획에 반영됨" : formatWon(plan.amount)}</b></span>)}{!Object.values(inputs.transferReturns).some((plan) => plan.amount > 0) && <span>아직 입력한 반납예정액이 없습니다.</span>}</>}{flowDetail === "other" && <><strong>이월·기타 제외 구성</strong><span>다음연도 이월 <b>{formatWon(inputs.nextCarryover)}</b></span><span>기타 반환·정산 <b>{formatWon(inputs.returns)}</b></span><span>기타 제외 <b>{formatWon(inputs.otherDeductions)}</b></span></>}{flowDetail === "total" && <><strong>최종 예상값</strong><span>{formatWon(currentBalance)} + {formatWon(futureReceipts)} − {formatWon(pendingExpense + plannedPromotion + newFutureSpending)} − {formatWon(transferReturnTotal)} − {formatWon(otherExclusions)}</span></>}</div>}<p className="forecast-disclaimer">입력한 향후 수입·지출계획을 기준으로 계산한 예상값이며 실제 결산액과 다를 수 있습니다.</p></section>

    {uncollected > 0 && <section className="revenue-alert"><ReceiptText size={20} /><div><strong>미수납액 {formatWon(uncollected)} · {revenueRows.filter((row) => row.uncollected > 0).length}개 항목</strong><span>징수결정은 되었지만 아직 실제 수납되지 않은 금액입니다. 아래 항목에서 향후 수납 여부를 조정하세요.</span></div></section>}

    <section className="closing-section"><div className="section-heading split-heading"><div><span className="section-kicker">향후 세입</span><h2>연말까지 더 들어올 금액</h2><p>예산보다 적게 들어온 금액을 기본값으로 넣었습니다. 들어오지 않을 금액은 줄여주세요.</p></div><button className="text-button" onClick={reset}><RefreshCw size={15} />예산 기준으로 초기화</button></div><div className="revenue-groups">{revenueGroups.map(([sectionName, groupRows]) => <details key={sectionName} className="revenue-group" open><summary><span><strong>{sectionName}</strong><small>{groupRows.length}개 항목</small></span><b>예상 {formatWon(groupRows.reduce((total, row) => total + row.collected + (inputs.additionalReceipts[row.costCode] ?? 0), 0))}</b><ChevronDown size={18} /></summary><div className="revenue-row-list">{groupRows.map((row) => { const additional = inputs.additionalReceipts[row.costCode] ?? 0; const expected = row.collected + additional; return <article className="revenue-row" key={row.costCode}><div className="revenue-row-main"><div className="revenue-name"><strong>{row.costName}</strong><span>{row.categoryName}</span></div><div className="revenue-metrics"><span>예산 <b>{formatWon(row.budget)}</b></span><span>현재 수납 <b>{formatWon(row.collected)}</b></span>{row.uncollected > 0 && <span className="metric-warning">미수납 <b>{formatWon(row.uncollected)}</b></span>}{row.budgetGap > 0 && <span className="metric-positive">예산 초과 <b>{formatWon(row.budgetGap)}</b></span>}</div></div><label className="closing-money-field"><span>향후 예상 수납</span><div className="won-input"><input inputMode="numeric" value={additional ? additional.toLocaleString("ko-KR") : ""} onChange={(event) => changeAdditional(row.costCode, event.target.value)} placeholder="0" aria-label={`${row.costName} 향후 예상 수납액`} /><span>원</span></div></label><div className="revenue-expected"><span>연말 예상</span><strong>{formatWon(expected)}</strong></div></article>; })}</div></details>)}</div>
      {priorSurplus && <div className="prior-surplus-note"><Info size={18} /><div><strong>전년도에서 넘어온 순세계잉여금 {formatWon(priorSurplus.collected)}</strong><span>현재 세입에 포함된 금액이며, 위에서 계산하는 올해 예상 순세계잉여금과는 다른 값입니다.</span></div></div>}
    </section>

    <section className="closing-section spending-plan-section">
      <div className="section-heading split-heading"><div><span className="section-kicker">향후 세출</span><h2>산출내역별 집행계획</h2><p>원인행위 기준으로 새로 집행 가능한 금액 1,000원 초과 항목만 모았습니다. 미확인 항목은 전액 집행으로 예상합니다.</p></div><button className="text-button" onClick={resetDetailPlans}><RefreshCw size={15} />확인 내역 초기화</button></div>
      <div className="spending-overview">
        <article><span>확인 대상</span><strong>{spendingDetails.length}건</strong><small>업무추진비·1,000원 이하 제외</small></article>
        <article><span>확인 완료</span><strong>{reviewedCount}건</strong><small>전체 {spendingDetails.length}건 중</small></article>
        <article className="warning"><span>미확인 집행 가능액</span><strong>{formatCompactWon(unreviewedBalance)}</strong><small>원인행위 기준 · 전액 집행 가정</small></article>
        <article className="primary"><span>산출내역 신규 집행계획</span><strong>{formatCompactWon(detailSpendingTotal)}</strong><small>확인 결과 즉시 반영</small></article>
      </div>
      <div className="spending-progress" aria-label={`산출내역 ${spendingDetails.length}건 중 ${reviewedCount}건 확인 완료`}><span style={{ width: `${spendingDetails.length ? (reviewedCount / spendingDetails.length) * 100 : 100}%` }} /></div>
      <div className="spending-progress-label"><span>{spendingDetails.length ? Math.round((reviewedCount / spendingDetails.length) * 100) : 100}% 확인</span><b>계획 확인 후 남는 금액 {formatCompactWon(detailExpectedBalance)}</b></div>
      <div className="spending-note"><Info size={18} /><span><strong>원인행위 기준입니다.</strong> 102-2의 원인행위불용예상액을 사용합니다. 이미 원인행위했지만 아직 지급 전인 금액은 새로 집행 가능한 금액에 포함하지 않습니다. 미확인 항목은 전액 집행으로 예상하며, 업무추진비는 별도 계획을 사용합니다.</span></div>
      {inputs.legacyDecision === "pending" && inputs.legacyFutureSpending > 0 && <div className="legacy-plan-alert"><AlertCircle size={20} /><div><strong>이전에 입력한 집행예정액 {formatCompactWon(inputs.legacyFutureSpending)}이 있습니다.</strong><span>새 산출내역별 계획과 중복될 수 있어 반영 여부를 선택해주세요.</span></div><div><button onClick={() => setLegacyDecision("keep")}>별도 금액으로 유지</button><button onClick={() => setLegacyDecision("discard")}>반영하지 않기</button></div></div>}
      <div className="spending-toolbar"><div className="spending-filters">{([['unreviewed', `미확인 ${unreviewedDetails.length}`], ['all', `전체 ${spendingDetails.length}`], ['reviewed', `확인완료 ${reviewedCount}`], ['partial', '일부 집행'], ['none', '미집행']] as const).map(([value, label]) => <button key={value} className={spendingFilter === value ? "active" : ""} onClick={() => setSpendingFilter(value)}>{label}</button>)}</div><label className="spending-search"><span className="sr-only">산출내역 검색</span><input value={spendingSearch} onChange={(event) => setSpendingSearch(event.target.value)} placeholder="사업·세부항목·산출내역 검색" /></label></div>
      <div className="spending-project-list">
        {spendingProjectGroups.map(([projectCode, details], groupIndex) => <details className="spending-project" key={projectCode} open={groupIndex === 0}><summary><span><strong>{details[0]?.projectName || "사업명 없음"}</strong><small>{details.length}개 산출내역</small></span><b>{formatCompactWon(details.reduce((total, detail) => total + effectiveDetailSpending(detail, inputs.detailSpendingPlans[detail.id]), 0))} 예정</b><ChevronDown size={18} /></summary><div className="spending-detail-list">{details.map((detail) => { const plan = inputs.detailSpendingPlans[detail.id]; const reviewed = isReviewed(detail); const stale = Boolean(plan && !reviewed); const mode = reviewed ? plan?.mode : undefined; const effective = effectiveDetailSpending(detail, plan); const expectedRemain = Math.max(0, detail.available - effective); return <article className={`spending-detail-card ${!reviewed ? "unreviewed" : ""}`} key={detail.id}><div className="spending-detail-head"><div><strong>{detail.calculation}</strong><span>{detail.itemName}{detail.costName && detail.costName !== detail.calculation ? ` · ${detail.costName}` : ""}</span></div><span className={`status-badge ${reviewed ? "complete" : stale ? "warning" : "muted"}`}>{reviewed ? "확인완료" : stale ? "재확인 필요" : "미확인"}</span></div><div className="spending-balance"><div><span>새로 집행 가능한 금액</span><small>원인행위 기준</small></div><strong>{formatWon(detail.available)}</strong></div><div className="spending-mode-field"><span>연말까지 얼마나 집행할까요?</span><div className="spending-mode-buttons"><button className={mode === "full" ? "active" : ""} onClick={() => changeDetailPlan(detail.id, "full", detail.available, detail.available)}>전액 집행</button><button className={mode === "partial" ? "active" : ""} onClick={() => { changeDetailPlan(detail.id, "partial", plan?.mode === "partial" ? plan.amount : detail.available, detail.available); setSpendingFilter("all"); }}>일부 집행</button><button className={mode === "none" ? "active" : ""} onClick={() => changeDetailPlan(detail.id, "none", 0, detail.available)}>집행 안 함</button></div></div>{mode === "partial" && <label className="spending-partial-field"><span>집행예정액</span><div className="won-input"><input inputMode="numeric" value={plan?.amount ? plan.amount.toLocaleString("ko-KR") : ""} onChange={(event) => changeDetailPlan(detail.id, "partial", numberValue(event.target.value.replace(/[^0-9]/g, "")), detail.available)} placeholder="0" aria-label={`${detail.calculation} 집행예정액`} /><span>원</span></div><small>새로 집행 가능한 금액 이하로 입력해주세요.</small></label>}<div className="spending-result"><span>신규 집행계획 <b>{formatWon(effective)}</b></span><span>계획 반영 후 남는 금액 <strong>{formatWon(expectedRemain)}</strong></span></div>{plan && <button className="text-button spending-clear" onClick={() => clearDetailPlan(detail.id)}>미확인으로 되돌리기</button>}</article>; })}</div></details>)}
        {!spendingProjectGroups.length && <div className="spending-empty"><SearchCheck size={22} /><p>조건에 맞는 산출내역이 없습니다.</p></div>}
      </div>
      <div className="closing-form-list spending-totals"><ReadOnlyMoneyRow label="현재 지급 완료" value={expenseTotals.paid} detail="실제 지급이 끝난 금액" /><ReadOnlyMoneyRow label="원인행위 후 지급 전" value={pendingExpense} detail="이미 지출이 예정되어 신규 집행 가능액에서 제외" /><ReadOnlyMoneyRow label="산출내역별 신규 집행계획" value={detailSpendingTotal} detail="아직 원인행위하지 않은 금액의 향후 계획 · 미확인은 전액 가정" /><ReadOnlyMoneyRow label="업무추진비 집행계획" value={plannedPromotion} detail={`${plannedPromotionCount}개 산출내역 · 업무추진비 탭에서 가져옴${promotionRecheckCount ? ` · ${promotionRecheckCount}건 재확인 필요` : ""}`} actionLabel="업무추진비 탭에서 수정" onAction={openPromotion} /><EditableMoneyRow label="산출내역에 없는 추가 집행액" value={extraFutureSpending} onChange={(value) => changeAmount("extraFutureSpending", value)} detail="산출내역으로 구분하기 어려운 금액만 입력" />{legacyIncluded > 0 && <ReadOnlyMoneyRow label="이전 입력액(별도 유지)" value={legacyIncluded} detail="기존 입력값을 별도 금액으로 유지 중" />}<ReadOnlyMoneyRow label="예상 최종 세출" value={expectedExpense} emphasized detail={`예상 불용액 ${formatWon(expectedUnused)}`} /></div>
    </section>

    <section className="closing-section transfer-section"><div className="section-heading"><span className="section-kicker">연말 반납 확인</span><h2>이전수입 반납예정액</h2><p>201 자료에서 이전수입을 찾아왔습니다. 실제 반납할 금액과 시기를 확인해주세요.</p></div>{!transferCandidates.length && <div className="transfer-empty-note"><Info size={18} /><span>201 세입자료에서 이전수입 항목을 찾지 못했습니다. 필요한 경우 아래에서 직접 입력하세요.</span></div>}<div className="transfer-return-list">{transferRows.map((row) => { const plan = inputs.transferReturns[row.costCode]; const amount = plan?.amount ?? 0; return <article className="transfer-return-card" key={row.costCode}><div className="transfer-return-head"><div><strong>{row.costName}</strong><span>{row.categoryName || row.sectionName}</span></div><span className={`status-badge ${amount > 0 ? "warning" : "muted"}`}>{amount > 0 ? "반납 예정" : "확인 필요"}</span></div><div className="transfer-return-meta"><span>현재 수납 <b>{formatWon(row.collected)}</b></span>{row.budget > 0 && <span>예산 <b>{formatWon(row.budget)}</b></span>}</div><div className="transfer-return-fields"><label className="form-field"><span>반납예정액</span><div className="won-input"><input inputMode="numeric" value={amount ? amount.toLocaleString("ko-KR") : ""} onChange={(event) => changeTransferReturn(row.costCode, { amount: Math.max(0, numberValue(event.target.value.replace(/[^0-9]/g, ""))) })} placeholder="0" aria-label={`${row.costName} 반납예정액`} /><span>원</span></div>{row.collected > 0 && amount > row.collected && <small className="field-warning">현재 수납액보다 큰 금액입니다.</small>}</label><label className="form-field"><span>반납 예정 시기</span><select value={plan?.schedule ?? "회계연도 말"} onChange={(event) => changeTransferReturn(row.costCode, { schedule: event.target.value as TransferReturnPlan["schedule"] })}><option>12월</option><option>회계연도 말</option><option>시기 미정</option></select></label><label className="form-field transfer-memo-field"><span>메모</span><input value={plan?.memo ?? ""} onChange={(event) => changeTransferReturn(row.costCode, { memo: event.target.value })} placeholder="예: 정산 결과 확인 후 반납" /></label></div><label className="double-count-check"><input type="checkbox" checked={plan?.includedInSpending ?? false} onChange={(event) => changeTransferReturn(row.costCode, { includedInSpending: event.target.checked })} /><span><strong>집행예정액에 이미 반영됨</strong><small>선택하면 순세계잉여금에서 다시 차감하지 않습니다.</small></span></label>{plan && <button className="text-button remove-transfer" onClick={() => removeTransferReturn(row.costCode)}><Trash2 size={14} />입력 삭제</button>}</article>; })}</div><div className="transfer-total"><span>별도 차감되는 이전수입 반납예정액</span><strong>{formatCompactWon(transferReturnTotal)}</strong></div><p className="transfer-help">같은 금액을 집행예정액에도 입력했다면 중복 차감되지 않도록 확인해주세요.</p></section>

    <section className="closing-section"><div className="section-heading"><span className="section-kicker">이월·기타 조정</span><h2>순세계잉여금에서 추가로 제외할 금액</h2><p>이전수입 반납액은 위에서 별도로 반영되므로 이곳에 중복 입력하지 마세요.</p></div><div className="adjustment-grid"><EditableMoneyRow label="다음연도 이월예정액" value={inputs.nextCarryover} onChange={(value) => changeAmount("nextCarryover", value)} detail="명시·사고·계속비 이월 예정액" /><EditableMoneyRow label="기타 반환·정산예정액" value={inputs.returns} onChange={(value) => changeAmount("returns", value)} detail="이전수입 외 보조금·목적사업비 반환 예상액" /><EditableMoneyRow label="기타 제외액" value={inputs.otherDeductions} onChange={(value) => changeAmount("otherDeductions", value)} detail="그 밖에 잉여금에서 제외할 금액" /></div><label className="closing-memo"><span>메모</span><textarea rows={3} value={inputs.memo} onChange={(event) => changeMemo(event.target.value)} placeholder="예: 목적사업비 정산 결과에 따라 변경 예정" /></label></section>

    <section className="closing-section driver-section"><div className="section-heading"><span className="section-kicker">예측 근거</span><h2>결과에 영향을 준 주요 항목</h2></div><ol>{drivers.map((driver, index) => <li key={`${driver}-${index}`}><span>{index + 1}</span><p>{driver}</p></li>)}</ol></section>
    <p className="local-note closing-local-note"><LockKeyhole size={15} />입력한 예측 내용은 이 브라우저에만 저장됩니다.</p>
  </section>;
}

function ClosingFlowRow({ operator, label, value, detail, emphasized, total, negative, tone, active, onClick }: { operator?: React.ReactNode; label: string; value: number; detail?: string; emphasized?: boolean; total?: boolean; negative?: boolean; tone?: "return"; active?: boolean; onClick?: () => void }) {
  return <button type="button" className={`closing-flow-row ${emphasized ? "emphasized" : ""} ${total ? "total" : ""} ${negative ? "negative" : ""} ${tone ? `tone-${tone}` : ""} ${active ? "active" : ""}`} onClick={onClick} aria-expanded={active}><span className="flow-operator">{operator}</span><div><span>{label}</span>{detail && <small>{detail}</small>}</div><strong>{formatCompactWon(value)}</strong><ChevronDown className="flow-chevron" size={17} /></button>;
}

function ReadOnlyMoneyRow({ label, value, detail, emphasized, actionLabel, onAction }: { label: string; value: number; detail: string; emphasized?: boolean; actionLabel?: string; onAction?: () => void }) {
  return <div className={`closing-form-row ${emphasized ? "emphasized" : ""}`}><div><strong>{label}</strong><span>{detail}</span>{actionLabel && onAction && <button type="button" className="inline-link-button" onClick={onAction}>{actionLabel}<ChevronRight size={14} /></button>}</div><b>{formatWon(value)}</b></div>;
}

function EditableMoneyRow({ label, value, detail, onChange }: { label: string; value: number; detail: string; onChange: (value: string) => void }) {
  return <label className="closing-form-row editable"><div><strong>{label}</strong><span>{detail}</span></div><div className="won-input"><input inputMode="numeric" value={value ? value.toLocaleString("ko-KR") : ""} onChange={(event) => onChange(event.target.value)} placeholder="0" /><span>원</span></div></label>;
}

function ProjectTable({ groups, expanded, toggle }: { groups: BudgetGroup[]; expanded: Set<string>; toggle: (id: string) => void }) {
  return <><div className="desktop-table-wrap"><table className="data-table"><thead><tr><th>세부사업</th><th>예산현액</th><th>지급완료</th><th>사용 가능</th><th>집행률</th><th>상태</th></tr></thead><tbody>{groups.flatMap((group) => { const isExpanded = expanded.has(group.id); const status = statusFor(group); const primary = <tr key={group.id} data-project-id={group.id} className="clickable-row" onClick={() => toggle(group.id)}><td><button className="row-title"><ChevronRight className={isExpanded ? "rotated" : ""} size={18} /><span><strong>{group.projectName}</strong><small>{group.policyName} · {group.unitName}</small></span></button></td><td>{formatWon(group.budget)}</td><td>{formatWon(group.paid)}</td><td className={group.available < 0 ? "negative-value" : "emphasis-cell"}>{formatWon(group.available)}</td><td>{formatPercent(group.rate)}</td><td><span className={`status-badge ${status.tone}`}>{status.label}</span></td></tr>; const detail = isExpanded ? <tr className="detail-row" key={`${group.id}-detail`}><td colSpan={6}><ProjectDetails rows={group.rows} /></td></tr> : null; return detail ? [primary, detail] : [primary]; })}</tbody></table></div><div className="mobile-project-list">{groups.map((group) => { const isExpanded = expanded.has(group.id); const status = statusFor(group); return <article className="mobile-project" data-project-id={group.id} key={group.id}><button onClick={() => toggle(group.id)}><div><strong>{group.projectName}</strong><span>{group.policyName}</span></div><div className="mobile-project-value"><small>사용 가능</small><b className={group.available < 0 ? "negative-value" : ""}>{formatWon(group.available)}</b></div><span className={`status-badge ${status.tone}`}>{status.label}</span><ChevronDown className={isExpanded ? "rotated" : ""} size={17} /></button>{isExpanded && <ProjectDetails rows={group.rows} />}</article>; })}</div></>;
}

function ProjectDetails({ rows }: { rows: BudgetRow[] }) { return <div className="project-details">{groupItemRows(rows).map((item) => <article key={item.name} className={item.overrunRows.length ? "overrun-item" : ""}><div className="detail-title"><strong>{item.name}</strong><span className={item.available < 0 ? "negative-value" : ""}>사용 가능 {formatWon(item.available)}</span></div><div className="detail-metrics"><span>예산 {formatWon(item.budget)}</span><span>원인행위 {formatWon(item.obligation)}</span><span>지급 {formatWon(item.paid)}</span>{item.overrunRows.length > 0 && <b>초과 {item.overrunRows.length}건</b>}</div>{item.overrunRows.length > 0 ? <div className="overrun-lines">{item.overrunRows.map((row, index) => <span key={`${row.calculation}-${index}`}><em>{row.calculation}</em><strong>{formatWon(row.available)}</strong></span>)}</div> : item.calculations.length > 0 && <p>{item.calculations.slice(0, 3).join(" · ")}{item.calculations.length > 3 ? ` 외 ${item.calculations.length - 3}건` : ""}</p>}</article>)}</div>; }
function AttentionButton({ selected, onClick, icon, tone, title, detail, value }: { selected: boolean; onClick: () => void; icon: React.ReactNode; tone: string; title: string; detail: string; value: string }) { return <button className={selected ? "selected" : ""} onClick={onClick}><div className={`attention-icon ${tone}`}>{icon}</div><div><strong>{title}</strong><span>{detail}</span></div><b>{value}</b><ChevronRight size={17} /></button>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><SearchCheck size={22} /><p>{text}</p></div>; }
function ResetDataModal({ close, clearExcel, clearAll }: { close: () => void; clearExcel: () => void; clearAll: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className="reset-modal" role="dialog" aria-modal="true" aria-labelledby="reset-data-title" onMouseDown={(event) => event.stopPropagation()}><div className="reset-modal-icon"><Trash2 size={20} /></div><h2 id="reset-data-title">자료를 비울까요?</h2><p>불러온 엑셀만 비우거나, 이 브라우저에 저장된 입력값까지 함께 삭제할 수 있습니다.</p><div className="reset-choice-note"><ShieldCheck size={17} /><span><strong>저장된 입력값에는 다음 내용이 포함됩니다.</strong><small>내 사업 집행계획 · 업무추진비 계획·메모 · 결산예측 입력값</small></span></div><div className="reset-modal-actions"><button className="button ghost" onClick={close}>취소</button><button className="button secondary" onClick={clearExcel}>엑셀만 비우기</button><button className="button danger" onClick={clearAll}><Trash2 size={16} />저장된 입력값까지 모두 삭제</button></div></section></div>;
}

function HelpModal({ close }: { close: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button modal-close" aria-label="도움말 닫기" onClick={close}><X size={20} /></button><span className="eyebrow">도움말</span><h2 id="help-title">예산현황판 사용 방법</h2><div className="help-steps">
    <div><b>1</b><span><strong>사업관리카드 내려받기</strong><small>에듀파인 &gt; 학교회계 &gt; 사업관리 &gt; 사업관리카드에서 (현액) 또는 (예산) 파일을 내려받습니다.</small></span></div>
    <div><b>2</b><span><strong>잔액 분석</strong><small>현재 잔액을 가장 먼저 보여주고, 전체 예산·사용 결정액은 근거 정보로 함께 표시합니다. 집행계획이 있으면 계획 반영 후 잔액을 추가로 계산하며, ‘어디에 예산이 많이 남아 있을까요?’ Top10으로 다른 사업도 이어서 탐색할 수 있습니다.</small></span></div>
    <div><b>3</b><span><strong>비목과 보고 싶은 단위로 좁혀보기</strong><small>비목 필터에서 일반수용비나 업무추진비 전체처럼 필요한 비목만 골라 볼 수 있습니다. 이어서 ‘세부사업으로 묶기’, ‘세부항목으로 묶기’, ‘산출내역 그대로’ 중 원하는 보기를 선택하세요.</small></span></div>
    <div><b>4</b><span><strong>앞으로 쓸 금액 입력</strong><small>산출내역별 집행예정액을 입력하면 예상 잔액이 바로 계산됩니다. 입력값은 현재 브라우저에만 저장됩니다.</small></span></div>
    <div><b>5</b><span><strong>102-2 내려받아 학교 전체 분석</strong><small>에듀파인 &gt; 학교회계 &gt; 예산결산 &gt; 결산현황 &gt; 집행실적에서 <b>엑셀저장(실시간)</b>을 누르고, 자료코드 <b>102-2</b>를 선택해 내려받습니다.</small></span></div>
    <div><b>6</b><span><strong>학교 전체 예산 흐름</strong><small><b>사용하기로 한 금액</b>은 원인행위액, <b>실제 지급한 금액</b>은 지출액입니다. <b>지급 대기</b>는 원인행위액에서 지출액을 뺀 금액이며, <b>아직 원인행위되지 않은 금액</b>은 예산현액에서 원인행위액을 뺀 금액입니다.</small></span></div>
    <div><b>7</b><span><strong>정책사업부터 세부항목까지 보기</strong><small>학교 전체 현황에서 정책사업·단위사업·세부사업·세부항목 단위로 묶어 보고, 단위사업 보기·세부사업 보기·세부항목 보기 버튼으로 다음 단계 내용을 확인할 수 있습니다.</small></span></div>
    <div><b>8</b><span><strong>201 세입실적 연결</strong><small>결산예측에서 자료코드 201을 연결하고, 이전수입 반납예정액과 순세계잉여금 잠정값을 확인합니다.</small></span></div>
    <div><b>9</b><span><strong>파일은 어디에 저장되나요?</strong><small>불러온 엑셀 파일은 서버로 업로드되지 않고 현재 브라우저에서 직접 분석됩니다. <b>자료 비우기</b>에서 엑셀만 비우거나, 내 사업 집행계획·업무추진비 계획·메모·결산예측 입력값까지 함께 삭제할 수 있습니다.</small></span></div>
  </div><div className="privacy-card"><LockKeyhole size={20} /><div><strong>서버로 파일을 보내지 않습니다.</strong><p>엑셀은 현재 브라우저에서만 분석됩니다. 직접 입력한 집행계획과 결산예측 값은 재접속을 위해 이 브라우저에 저장될 수 있습니다.</p></div></div></section></div>;
}
