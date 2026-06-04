import re
from io import BytesIO
from typing import Dict, List, Tuple

# Requires the Tesseract OCR runtime to be installed on the host system
# For PDF uploads, Poppler utilities are required for pdf2image conversion.
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes

IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp')
PDF_EXTENSIONS = ('.pdf',)
SUPPORTED_OCR_EXTENSIONS = IMAGE_EXTENSIONS + PDF_EXTENSIONS


def extract_text_from_image_bytes(file_bytes: bytes) -> str:
    with Image.open(BytesIO(file_bytes)) as img:
        image = img.convert('RGB')
        return pytesseract.image_to_string(image, config='--oem 3 --psm 6')


def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    images = convert_from_bytes(file_bytes)
    texts = []
    for image in images:
        texts.append(pytesseract.image_to_string(image, config='--oem 3 --psm 6'))
    return '\n'.join(texts)


def parse_marks_from_ocr_text(text: str) -> Tuple[List[Dict], List[str]]:
    errors: List[str] = []
    records: List[Dict] = []

    if not text or not text.strip():
        return [], ['No text was extracted from the uploaded file.']

    normalized = text.replace('\r', '\n')
    lines = [line.strip() for line in normalized.splitlines() if line.strip()]

    for index, line in enumerate(lines, start=1):
        numbers = re.findall(r'\d+(?:\.\d+)?', line)
        if len(numbers) < 2:
            continue

        roll = None
        marks = None

        roll_match = re.search(r'roll[^0-9]*(\d+)', line, re.IGNORECASE)
        marks_match = re.search(r'mark[^0-9]*(\d+(?:\.\d+)?)', line, re.IGNORECASE)
        if roll_match and marks_match:
            try:
                roll = int(roll_match.group(1))
                marks = float(marks_match.group(1))
            except ValueError:
                pass

        if roll is None or marks is None:
            candidates = [float(n) for n in numbers]
            for i in range(len(candidates) - 1):
                candidate_roll = int(round(candidates[i]))
                candidate_marks = candidates[i + 1]
                if 0 <= candidate_marks <= 100 and candidate_roll > 0:
                    roll = candidate_roll
                    marks = candidate_marks
                    break

        if roll is None or marks is None:
            continue

        if marks < 0 or marks > 100:
            errors.append(f'Line {index}: marks value {marks} out of range')
            continue

        records.append({'roll': roll, 'marks': marks})

    if not records:
        errors.append('Could not detect any valid student roll and marks pairs.')

    return records, errors


def parse_marks_from_ocr_file(file_bytes: bytes, filename: str) -> Tuple[List[Dict], List[str]]:
    lower_name = filename.lower()
    if lower_name.endswith(IMAGE_EXTENSIONS):
        try:
            text = extract_text_from_image_bytes(file_bytes)
        except Exception as exc:
            return [], [f'Could not read image file: {exc}']
    elif lower_name.endswith(PDF_EXTENSIONS):
        try:
            text = extract_text_from_pdf_bytes(file_bytes)
        except Exception as exc:
            return [], [f'Could not read PDF file: {exc}']
    else:
        return [], [f'Unsupported file type: {filename}']

    return parse_marks_from_ocr_text(text)
