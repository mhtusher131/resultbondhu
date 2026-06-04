from typing import Tuple


HSC_GRADE_TABLE = [
    (80, 100, "A+", 5.00),
    (70, 79,  "A",  4.00),
    (60, 69,  "A-", 3.50),
    (50, 59,  "B",  3.00),
    (40, 49,  "C",  2.00),
    (33, 39,  "D",  1.00),
    (0,  32,  "F",  0.00),
]


def get_grade(marks: float) -> Tuple[str, float]:
    """Return (grade_letter, grade_point) for a given mark."""
    for low, high, letter, point in HSC_GRADE_TABLE:
        if low <= marks <= high:
            return letter, point
    return "F", 0.00


def calculate_gpa(subject_grades: list[dict]) -> Tuple[float, str]:
    """
    Calculate GPA using HSC 4th-subject rules.

    subject_grades should contain dict items with:
    - grade_point: float
    - grade_letter: str
    - subject_type: 'mandatory' or 'optional'

    The main GPA is calculated from all mandatory subjects.
    The optional subject only adds bonus when GP > 2.00.
    """
    mandatory = [g for g in subject_grades if g["subject_type"] == "mandatory"]
    optional = [g for g in subject_grades if g["subject_type"] == "optional"]

    if not mandatory:
        return 0.0, "FAIL"

    has_fail = any(g["grade_letter"] == "F" for g in mandatory)
    main_gpa = sum(g["grade_point"] for g in mandatory) / len(mandatory)

    bonus = 0.0
    if optional:
        optional_gps = [g["grade_point"] for g in optional]
        best_optional_gp = max(optional_gps)
        if best_optional_gp > 2.00:
            bonus = (best_optional_gp - 2.00) / len(mandatory)

    final_gpa = main_gpa + bonus
    if final_gpa > 5.00:
        final_gpa = 5.00

    status = "FAIL" if has_fail else "PASS"
    return round(final_gpa, 2), status
