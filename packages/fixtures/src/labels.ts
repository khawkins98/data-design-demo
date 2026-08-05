/**
 * Label sets in four locales.
 *
 * Locale choice is deliberate and each one is testing something:
 *   en  the baseline every other locale is compared against
 *   fr  a second LTR locale with moderately longer strings
 *   de  long compound nouns, to expose truncation and overflow bugs
 *   ar  right-to-left, to expose direction and mirroring bugs
 *
 * The five `long*` keys are all over 60 characters in every locale. They exist
 * to be dropped into buttons, table headers, select options and validation
 * summaries, where a library that assumes short labels will break visibly.
 *
 * Brief 1 forbids translating, truncating or rewording any of this.
 */

import type { LabelSet, LocaleCode, LocaleMeta } from "./types.js";

export const LOCALES: readonly LocaleMeta[] = Object.freeze([
  { code: "en", label: "English", dir: "ltr", bcp47: "en-GB" },
  { code: "fr", label: "Français", dir: "ltr", bcp47: "fr-FR" },
  { code: "de", label: "Deutsch", dir: "ltr", bcp47: "de-DE" },
  { code: "ar", label: "العربية", dir: "rtl", bcp47: "ar-EG" },
]);

const en: LabelSet = {
  appTitle: "Disaster loss data review",
  navOverview: "Overview",
  navRecords: "Loss records",
  navSubmissions: "Submissions",
  navVerification: "Verification queue",
  navSettings: "Settings",

  colCountry: "Country",
  colHazard: "Hazard type",
  colEventDate: "Event date",
  colReportedAt: "Reported at",
  colPeopleAffected: "People affected",
  colEconomicLoss: "Economic loss (USD m)",
  colDataSource: "Data source",
  colStatus: "Verification status",
  colNarrative: "Narrative",
  colReviewNote: "Review note",

  actionSave: "Save",
  actionCancel: "Cancel",
  actionDelete: "Delete",
  actionFilter: "Filter",
  actionClearFilters: "Clear filters",
  actionExport: "Export",

  fieldCountry: "Country",
  fieldHazard: "Hazard type",
  fieldEventDate: "Event date",
  fieldReportingWindow: "Reporting window",
  fieldDataSource: "Data source",
  fieldNarrative: "Narrative",

  stateLoading: "Loading records",
  stateEmpty: "No records match the current filters",
  stateError: "The records could not be loaded",
  stateSuccess: "Record saved",

  validationRequired: "This field is required",
  validationFormat: "Enter a valid ISO 8601 date",
  validationRange: "Enter a value between 0 and 1,000,000",
  validationServer: "The server rejected this submission",

  longVerificationBanner:
    "Records shown here have not completed national verification and must not be cited as official figures.",
  longMethodologyNotice:
    "Economic loss values follow the Sendai Framework methodology and are not directly comparable across reporting periods.",
  longRetentionNotice:
    "Submitted records are retained for seven years and may be reviewed by the national focal point at any point during that period.",
  longAccessibilityNotice:
    "If any part of this service is not accessible to you, contact the service owner and an alternative format will be provided.",
  longSubmissionGuidance:
    "Complete every required field before submitting, because partially completed records cannot be saved as drafts in this release.",
};

const fr: LabelSet = {
  appTitle: "Examen des données de pertes",
  navOverview: "Vue d'ensemble",
  navRecords: "Enregistrements de pertes",
  navSubmissions: "Soumissions",
  navVerification: "File de vérification",
  navSettings: "Paramètres",

  colCountry: "Pays",
  colHazard: "Type d'aléa",
  colEventDate: "Date de l'événement",
  colReportedAt: "Date de signalement",
  colPeopleAffected: "Personnes affectées",
  colEconomicLoss: "Pertes économiques (M USD)",
  colDataSource: "Source des données",
  colStatus: "Statut de vérification",
  colNarrative: "Description",
  colReviewNote: "Note d'examen",

  actionSave: "Enregistrer",
  actionCancel: "Annuler",
  actionDelete: "Supprimer",
  actionFilter: "Filtrer",
  actionClearFilters: "Effacer les filtres",
  actionExport: "Exporter",

  fieldCountry: "Pays",
  fieldHazard: "Type d'aléa",
  fieldEventDate: "Date de l'événement",
  fieldReportingWindow: "Période de déclaration",
  fieldDataSource: "Source des données",
  fieldNarrative: "Description",

  stateLoading: "Chargement des enregistrements",
  stateEmpty: "Aucun enregistrement ne correspond aux filtres actuels",
  stateError: "Les enregistrements n'ont pas pu être chargés",
  stateSuccess: "Enregistrement sauvegardé",

  validationRequired: "Ce champ est obligatoire",
  validationFormat: "Saisissez une date ISO 8601 valide",
  validationRange: "Saisissez une valeur comprise entre 0 et 1 000 000",
  validationServer: "Le serveur a rejeté cette soumission",

  longVerificationBanner:
    "Les enregistrements présentés ici n'ont pas achevé la vérification nationale et ne doivent pas être cités comme chiffres officiels.",
  longMethodologyNotice:
    "Les valeurs de pertes économiques suivent la méthodologie du Cadre de Sendai et ne sont pas directement comparables entre périodes de déclaration.",
  longRetentionNotice:
    "Les enregistrements soumis sont conservés pendant sept ans et peuvent être examinés par le point focal national à tout moment durant cette période.",
  longAccessibilityNotice:
    "Si une partie de ce service ne vous est pas accessible, contactez le responsable du service et un format alternatif vous sera fourni.",
  longSubmissionGuidance:
    "Complétez chaque champ obligatoire avant de soumettre, car les enregistrements partiellement remplis ne peuvent pas être sauvegardés comme brouillons.",
};

const de: LabelSet = {
  appTitle: "Überprüfung der Schadensdaten",
  navOverview: "Übersicht",
  navRecords: "Schadensdatensätze",
  navSubmissions: "Einreichungen",
  navVerification: "Verifizierungswarteschlange",
  navSettings: "Einstellungen",

  colCountry: "Land",
  colHazard: "Gefahrenart",
  colEventDate: "Ereignisdatum",
  colReportedAt: "Meldezeitpunkt",
  colPeopleAffected: "Betroffene Personen",
  colEconomicLoss: "Wirtschaftlicher Schaden (Mio. USD)",
  colDataSource: "Datenquelle",
  colStatus: "Verifizierungsstatus",
  colNarrative: "Ereignisbeschreibung",
  colReviewNote: "Prüfungsvermerk",

  actionSave: "Speichern",
  actionCancel: "Abbrechen",
  actionDelete: "Löschen",
  actionFilter: "Filtern",
  actionClearFilters: "Filter zurücksetzen",
  actionExport: "Exportieren",

  fieldCountry: "Land",
  fieldHazard: "Gefahrenart",
  fieldEventDate: "Ereignisdatum",
  fieldReportingWindow: "Berichterstattungszeitraum",
  fieldDataSource: "Datenquelle",
  fieldNarrative: "Ereignisbeschreibung",

  stateLoading: "Datensätze werden geladen",
  stateEmpty: "Keine Datensätze entsprechen den aktuellen Filtereinstellungen",
  stateError: "Die Datensätze konnten nicht geladen werden",
  stateSuccess: "Datensatz gespeichert",

  validationRequired: "Dieses Feld ist erforderlich",
  validationFormat: "Geben Sie ein gültiges ISO-8601-Datum ein",
  validationRange: "Geben Sie einen Wert zwischen 0 und 1.000.000 ein",
  validationServer: "Der Server hat diese Einreichung abgelehnt",

  longVerificationBanner:
    "Die hier angezeigten Datensätze haben die nationale Verifizierung nicht abgeschlossen und dürfen nicht als amtliche Zahlen zitiert werden.",
  longMethodologyNotice:
    "Die wirtschaftlichen Schadenswerte folgen der Methodik des Sendai-Rahmenwerks und sind zwischen Berichterstattungszeiträumen nicht unmittelbar vergleichbar.",
  longRetentionNotice:
    "Eingereichte Datensätze werden sieben Jahre lang aufbewahrt und können von der nationalen Kontaktstelle jederzeit innerhalb dieses Zeitraums geprüft werden.",
  longAccessibilityNotice:
    "Sollte ein Teil dieses Dienstes für Sie nicht zugänglich sein, wenden Sie sich an den Dienstverantwortlichen, und ein alternatives Format wird bereitgestellt.",
  longSubmissionGuidance:
    "Füllen Sie jedes Pflichtfeld aus, bevor Sie absenden, da teilweise ausgefüllte Datensätze in dieser Version nicht als Entwurf gespeichert werden können.",
};

const ar: LabelSet = {
  appTitle: "مراجعة بيانات الخسائر",
  navOverview: "نظرة عامة",
  navRecords: "سجلات الخسائر",
  navSubmissions: "الطلبات المقدمة",
  navVerification: "قائمة التحقق",
  navSettings: "الإعدادات",

  colCountry: "البلد",
  colHazard: "نوع الخطر",
  colEventDate: "تاريخ الحدث",
  colReportedAt: "وقت الإبلاغ",
  colPeopleAffected: "الأشخاص المتأثرون",
  colEconomicLoss: "الخسائر الاقتصادية (مليون دولار)",
  colDataSource: "مصدر البيانات",
  colStatus: "حالة التحقق",
  colNarrative: "الوصف",
  colReviewNote: "ملاحظة المراجعة",

  actionSave: "حفظ",
  actionCancel: "إلغاء",
  actionDelete: "حذف",
  actionFilter: "تصفية",
  actionClearFilters: "مسح عوامل التصفية",
  actionExport: "تصدير",

  fieldCountry: "البلد",
  fieldHazard: "نوع الخطر",
  fieldEventDate: "تاريخ الحدث",
  fieldReportingWindow: "فترة الإبلاغ",
  fieldDataSource: "مصدر البيانات",
  fieldNarrative: "الوصف",

  stateLoading: "جارٍ تحميل السجلات",
  stateEmpty: "لا توجد سجلات تطابق عوامل التصفية الحالية",
  stateError: "تعذر تحميل السجلات",
  stateSuccess: "تم حفظ السجل",

  validationRequired: "هذا الحقل مطلوب",
  validationFormat: "أدخل تاريخًا صالحًا بصيغة ISO 8601",
  validationRange: "أدخل قيمة بين 0 و 1000000",
  validationServer: "رفض الخادم هذا الطلب",

  longVerificationBanner:
    "السجلات المعروضة هنا لم تستكمل التحقق الوطني ويجب عدم الاستشهاد بها بوصفها أرقامًا رسمية.",
  longMethodologyNotice:
    "تتبع قيم الخسائر الاقتصادية منهجية إطار سينداي وليست قابلة للمقارنة مباشرة بين فترات الإبلاغ.",
  longRetentionNotice:
    "يتم الاحتفاظ بالسجلات المقدمة لمدة سبع سنوات ويجوز لجهة الاتصال الوطنية مراجعتها في أي وقت خلال تلك الفترة.",
  longAccessibilityNotice:
    "إذا كان أي جزء من هذه الخدمة غير متاح لك، فيرجى الاتصال بمسؤول الخدمة وسيتم توفير صيغة بديلة.",
  longSubmissionGuidance:
    "أكمل جميع الحقول المطلوبة قبل الإرسال، لأن السجلات المكتملة جزئيًا لا يمكن حفظها كمسودات في هذا الإصدار.",
};

export const LABELS: Readonly<Record<LocaleCode, LabelSet>> = Object.freeze({
  en,
  fr,
  de,
  ar,
});

/** The five keys guaranteed to exceed 60 characters in every locale. */
export const LONG_LABEL_KEYS = Object.freeze([
  "longVerificationBanner",
  "longMethodologyNotice",
  "longRetentionNotice",
  "longAccessibilityNotice",
  "longSubmissionGuidance",
] as const);
