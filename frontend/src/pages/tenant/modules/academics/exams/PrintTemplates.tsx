import { LayoutAnnual, LayoutProgress, LayoutClassTest, LayoutTermEnd, type LayoutProps } from "./ReportLayouts";

export interface PrintProps extends LayoutProps {
    qrUrl?: string; // QR image (data URL) that opens the online verification page
}

/** Ids a school can choose on Report Card Templates. "scholarsheet" is printed from the ScholarSheet page. */
export const REPORT_TEMPLATE_IDS = ["scholarsheet", "annual_exam", "progress_report", "class_test", "term_end"] as const;

function PickTemplate({ templateId, ...props }: LayoutProps & { templateId: string }) {
    switch (templateId) {
        case "progress_report": return <LayoutProgress {...props} />;
        case "class_test":      return <LayoutClassTest {...props} />;
        case "term_end":        return <LayoutTermEnd {...props} />;
        // "annual_exam", plus any id from the retired designs (kcse_*, cbc_*, cam_*, ib_*, cherith_termly …)
        default:                return <LayoutAnnual {...props} />;
    }
}

/** Any report-card design, followed by a small "scan to verify" strip when a QR is supplied. */
export function RenderPrintTemplate(props: PrintProps & { templateId: string }) {
    const { qrUrl, ...rest } = props;
    return (
        <>
            <PickTemplate {...rest} />
            {qrUrl && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 12px 0", breakInside: "avoid" }}>
                    <img src={qrUrl} alt="QR" style={{ width: 54, height: 54 }} />
                    <div style={{ textAlign: "center", fontSize: 8, color: "#64748b", lineHeight: 1.35 }}>
                        <b style={{ color: "#334155" }}>Scan to verify this report</b> · Confirms it was issued by {props.schoolName}
                    </div>
                </div>
            )}
        </>
    );
}
