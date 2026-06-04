from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from schemas import ExamResultSummary
from datetime import datetime


GREEN = colors.HexColor("#1D9E75")
DARK_GREEN = colors.HexColor("#085041")
LIGHT_GREEN = colors.HexColor("#E1F5EE")
GRAY = colors.HexColor("#888780")
LIGHT_GRAY = colors.HexColor("#F1EFE8")
RED = colors.HexColor("#E24B4A")
BLUE = colors.HexColor("#378ADD")


def generate_grade_sheet_pdf(summary: ExamResultSummary) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle(
        "title", fontSize=16, fontName="Helvetica-Bold",
        alignment=TA_CENTER, textColor=DARK_GREEN, spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        "subtitle", fontSize=10, fontName="Helvetica",
        alignment=TA_CENTER, textColor=GRAY, spaceAfter=4
    )
    section_style = ParagraphStyle(
        "section", fontSize=11, fontName="Helvetica-Bold",
        textColor=DARK_GREEN, spaceBefore=8, spaceAfter=4
    )

    exam = summary.exam
    college = exam.college

    # Header
    elements.append(Paragraph(college.name.upper(), title_style))
    if college.eiin:
        elements.append(Paragraph(f"EIIN: {college.eiin}", subtitle_style))
    elements.append(Paragraph(
        f"HSC {exam.year} — {exam.term} | {exam.group} Group | Grade Sheet",
        subtitle_style
    ))
    elements.append(HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=8))

    # Summary stats
    stats_data = [
        ["Total Appeared", "Passed", "Failed", "Pass Rate", "Avg GPA", "A+ Count"],
        [
            str(summary.appeared),
            str(summary.passed),
            str(summary.failed),
            f"{summary.pass_rate:.1f}%",
            str(summary.average_gpa),
            str(summary.a_plus_count),
        ],
    ]
    stats_table = Table(stats_data, colWidths=[2.8 * cm] * 6)
    stats_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWHEIGHT", (0, 0), (-1, -1), 18),
        ("BACKGROUND", (0, 1), (-1, 1), LIGHT_GREEN),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.white),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
    ]))
    elements.append(stats_table)
    elements.append(Paragraph(
        f"Highest GPA: {summary.highest_gpa:.2f} | Lowest GPA: {summary.lowest_gpa:.2f}",
        subtitle_style
    ))
    elements.append(Spacer(1, 10))

    # Per-student result table
    elements.append(Paragraph("Individual Student Results", section_style))

    if not summary.results:
        elements.append(Paragraph("No results available.", styles["Normal"]))
    else:
        # Collect all subject names
        subject_names = []
        if summary.results:
            subject_names = [sr.subject_name for sr in summary.results[0].subject_results]

        headers = ["Pos", "Roll", "Name"] + subject_names + ["GPA", "Status"]
        col_widths = [1.2 * cm, 2.0 * cm, 3.5 * cm] + [2.0 * cm] * len(subject_names) + [1.4 * cm, 1.4 * cm]

        table_data = [headers]
        for res in summary.results:
            marks_cells = [f"{sr.grade_letter}\n{int(sr.marks)}" for sr in res.subject_results]
            row = [str(res.position or ""), str(res.roll), res.full_name] + marks_cells + [str(res.gpa), res.status]
            table_data.append(row)

        result_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWHEIGHT", (0, 0), (-1, -1), 22),
            ("GRID", (0, 0), (-1, -1), 0.3, GRAY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
            ("ALIGN", (1, 1), (1, -1), "LEFT"),
        ]
        # Color PASS/FAIL column
        for i, res in enumerate(summary.results, start=1):
            col = len(headers) - 1
            if res.status == "PASS":
                style_cmds.append(("TEXTCOLOR", (col, i), (col, i), GREEN))
            else:
                style_cmds.append(("TEXTCOLOR", (col, i), (col, i), RED))
            # Color GPA
            gpa_col = len(headers) - 2
            if res.gpa >= 4.0:
                style_cmds.append(("TEXTCOLOR", (gpa_col, i), (gpa_col, i), DARK_GREEN))

        result_table.setStyle(TableStyle(style_cmds))
        elements.append(result_table)

    # Footer
    elements.append(Spacer(1, 16))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=GRAY))
    footer_style = ParagraphStyle("footer", fontSize=8, textColor=GRAY, alignment=TA_CENTER, spaceBefore=4)
    elements.append(Paragraph(
        f"Generated by ResultBondhu | {college.name} | {datetime.now().strftime('%d %b %Y %H:%M')}",
        footer_style
    ))

    # GPA Scale reference
    elements.append(Spacer(1, 10))
    scale_data = [
        ["Marks", "Grade", "GPA", "Marks", "Grade", "GPA"],
        ["80-100", "A+", "5.00", "40-49", "C", "2.00"],
        ["70-79",  "A",  "4.00", "33-39", "D", "1.00"],
        ["60-69",  "A-", "3.50", "0-32",  "F", "0.00"],
        ["50-59",  "B",  "3.00", "", "", ""],
    ]
    scale_table = Table(scale_data, colWidths=[2.0 * cm] * 6)
    scale_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.3, GRAY),
        ("BACKGROUND", (0, 1), (-1, -1), LIGHT_GRAY),
        ("ROWHEIGHT", (0, 0), (-1, -1), 16),
    ]))
    elements.append(Paragraph("HSC Grading Scale Reference", section_style))
    elements.append(scale_table)

    doc.build(elements)
    return buffer.getvalue()


def generate_student_result_pdf(summary: ExamResultSummary, student_result) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle(
        "title", fontSize=16, fontName="Helvetica-Bold",
        alignment=TA_CENTER, textColor=DARK_GREEN, spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        "subtitle", fontSize=10, fontName="Helvetica",
        alignment=TA_CENTER, textColor=GRAY, spaceAfter=4
    )
    section_style = ParagraphStyle(
        "section", fontSize=11, fontName="Helvetica-Bold",
        textColor=DARK_GREEN, spaceBefore=8, spaceAfter=4
    )

    elements.append(Paragraph(summary.exam.college.name.upper(), title_style))
    if summary.exam.college.eiin:
        elements.append(Paragraph(f"EIIN: {summary.exam.college.eiin}", subtitle_style))
    elements.append(Paragraph(
        f"HSC {summary.exam.year} — {summary.exam.term} | {summary.exam.group} Group | Student Marksheet",
        subtitle_style
    ))
    elements.append(HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=8))

    student_info = [
        ["Roll", str(student_result.roll), "Position", str(student_result.position or "N/A")],
        ["Name", student_result.full_name, "Status", student_result.status],
        ["Reg. No", student_result.registration_number or "N/A", "GPA", f"{student_result.gpa:.2f}"],
        ["Optional Subject", student_result.optional_subject or next((sr.subject_name for sr in student_result.subject_results if sr.subject_type == 'optional'), 'N/A'), "Guardian Phone", getattr(student_result, 'guardian_phone', 'N/A')],
    ]
    info_table = Table(student_info, colWidths=[3.5 * cm, 6.0 * cm, 3.5 * cm, 3.5 * cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GREEN),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.3, GRAY),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("Subject Grades", section_style))
    headers = ["Subject", "Code", "Marks", "Grade", "Point", "Type"]
    table_data = [headers]
    for sr in student_result.subject_results:
        table_data.append([
            sr.subject_name,
            sr.subject_code,
            str(int(sr.marks)),
            sr.grade_letter,
            f"{sr.grade_point:.2f}",
            sr.subject_type,
        ])

    result_table = Table(table_data, colWidths=[5.5 * cm, 2.5 * cm, 2.0 * cm, 2.0 * cm, 2.0 * cm, 2.5 * cm])
    result_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.3, GRAY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    # Highlight the optional subject row
    for idx, sr in enumerate(student_result.subject_results, start=1):
        if sr.subject_type == "optional":
            result_table.setStyle(TableStyle([
                ("BACKGROUND", (0, idx), (-1, idx), colors.HexColor("#F5FFF8")),
                ("TEXTCOLOR", (0, idx), (-1, idx), DARK_GREEN),
            ]))
    elements.append(result_table)

    # Totals and grade summary
    total_marks = sum(int(sr.marks) for sr in student_result.subject_results)
    totals_table = Table([
        ["Total Marks", str(total_marks), "Number of Subjects", str(len(student_result.subject_results))]
    ], colWidths=[4.5 * cm, 3.0 * cm, 4.5 * cm, 2.5 * cm])
    totals_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GREEN),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.3, GRAY),
    ]))
    elements.append(Spacer(1, 12))
    elements.append(totals_table)
    elements.append(Spacer(1, 16))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=GRAY))
    footer_style = ParagraphStyle("footer", fontSize=8, textColor=GRAY, alignment=TA_CENTER, spaceBefore=4)
    elements.append(Paragraph(
        f"Generated by ResultBondhu | {summary.exam.college.name} | {datetime.now().strftime('%d %b %Y %H:%M')}",
        footer_style
    ))

    doc.build(elements)
    return buffer.getvalue()
