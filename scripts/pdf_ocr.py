"""Read scanned PDF pages using Tesseract or Windows' built-in English OCR."""

import csv
from io import StringIO
import json
from pathlib import Path
import re
from shutil import which
from statistics import median
import subprocess
import sys
from tempfile import TemporaryDirectory


def words_to_layout(words):
    """Align OCR words by their image coordinates so table columns survive."""
    words = [word for word in words if word["text"].strip() and word["height"] > 0]
    if not words:
        return ""
    character_width = median(word["width"] / len(word["text"]) for word in words)
    rows = []
    for word in sorted(words, key=lambda item: item["y"] + item["height"] / 2):
        center = word["y"] + word["height"] / 2
        if not rows or abs(center - rows[-1][0]) > median(
            item["height"] for item in rows[-1][1]
        ) * 0.5:
            rows.append((center, [word]))
        else:
            rows[-1][1].append(word)
    lines = []
    for _, row in rows:
        line = ""
        for word in sorted(row, key=lambda item: item["x"]):
            column = round(word["x"] / max(character_width, 1))
            line += " " * max(1 if line else 0, column - len(line)) + word["text"]
        lines.append(line)
    return "\n".join(lines)


def recognize_images(directory, tesseract):
    try:
        if tesseract:
            results = {}
            for path in Path(directory).glob("*.png"):
                output = subprocess.run(
                    [tesseract, str(path), "stdout", "-l", "eng", "--psm", "6", "tsv"],
                    capture_output=True, text=True, encoding="utf-8", check=True, timeout=60,
                )
                words = [
                    {"text": row["text"], "x": float(row["left"]), "y": float(row["top"]),
                     "width": float(row["width"]), "height": float(row["height"])}
                    for row in csv.DictReader(StringIO(output.stdout), delimiter="\t")
                    if row["text"].strip()
                ]
                results[path.stem] = words_to_layout(words)
            return results
        output = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-File",
             str(Path(__file__).with_name("windows_ocr.ps1")), "-ImageDirectory", str(directory)],
            capture_output=True, text=True, encoding="utf-8", check=True, timeout=180,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        return {page["page"]: words_to_layout(page["words"]) for page in json.loads(output.stdout)}
    except (subprocess.SubprocessError, OSError, ValueError) as error:
        detail = getattr(error, "stderr", None) or str(error)
        raise ValueError(f"Could not OCR scanned PDF: {detail.strip()}") from error


def text_score(text):
    return sum(len(word) for word in re.findall(r"[a-zA-Z]{3,}", text))


def ocr_pages(body, page_numbers):
    """Return 0-based PDF page indices mapped to OCR text with table spacing."""
    tesseract = which("tesseract")
    if not tesseract and sys.platform != "win32":
        raise ValueError("Scanned PDF requires Tesseract OCR on PATH")
    try:
        import pypdfium2 as pdfium
        from PIL import Image
    except ImportError as error:
        raise ValueError("Install scripts/requirements.txt to render scanned PDFs") from error
    with TemporaryDirectory(prefix="clearcause-ocr-") as directory:
        with pdfium.PdfDocument(body) as pdf:
            for number in page_numbers:
                page = pdf[number]
                try:
                    bitmap = page.render(scale=min(2.5, 4000 / max(page.get_size())))
                    try:
                        with bitmap.to_pil() as image:
                            image.save(Path(directory, f"{number}.png"))
                    finally:
                        bitmap.close()
                finally:
                    page.close()
        texts = recognize_images(directory, tesseract)
        rotated_directory = Path(directory, "rotated")
        rotated_directory.mkdir()
        for number in page_numbers:
            if text_score(texts[str(number)]) >= 80:
                continue
            with Image.open(Path(directory, f"{number}.png")) as image:
                for angle in (90, 270):
                    with image.rotate(angle, expand=True) as rotated:
                        rotated.save(rotated_directory / f"{number}-{angle}.png")
        if any(rotated_directory.iterdir()):
            for name, text in recognize_images(rotated_directory, tesseract).items():
                number = name.partition("-")[0]
                if text_score(text) > text_score(texts[number]):
                    texts[number] = text
        return {int(number): text for number, text in texts.items()}
