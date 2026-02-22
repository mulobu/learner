import hashlib
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

from app.core.exceptions import NoTOCFoundError, PDFProcessingError

logger = logging.getLogger(__name__)

# Tesseract data path (Homebrew default on macOS)
_TESSDATA = "/opt/homebrew/share/tessdata"
if os.path.isdir(_TESSDATA):
    os.environ.setdefault("TESSDATA_PREFIX", _TESSDATA)


@dataclass
class PDFMetadata:
    title: str
    author: str | None
    total_pages: int


@dataclass
class TOCEntry:
    level: int
    title: str
    start_page: int
    end_page: int
    children: list["TOCEntry"] = field(default_factory=list)


class PDFService:
    def compute_hash(self, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    def extract_metadata(self, file_path: str) -> PDFMetadata:
        try:
            doc = pymupdf.open(file_path)
            metadata = doc.metadata or {}
            total_pages = len(doc)
            title = metadata.get("title", "") or Path(file_path).stem
            author = metadata.get("author") or None
            doc.close()
            return PDFMetadata(
                title=title.strip(),
                author=author.strip() if author else None,
                total_pages=total_pages,
            )
        except Exception as e:
            raise PDFProcessingError(str(e))

    def extract_toc(self, file_path: str) -> list[TOCEntry]:
        try:
            doc = pymupdf.open(file_path)
            raw_toc = doc.get_toc()
            total_pages = len(doc)
            doc.close()
        except Exception as e:
            raise PDFProcessingError(str(e))

        if not raw_toc:
            raise NoTOCFoundError(Path(file_path).name)

        # Build flat list with computed page ranges
        flat_entries: list[TOCEntry] = []
        for i, (level, title, page) in enumerate(raw_toc):
            # Compute end_page from next entry's start page
            if i + 1 < len(raw_toc):
                end_page = raw_toc[i + 1][2] - 1
                if end_page < page:
                    end_page = page
            else:
                end_page = total_pages

            flat_entries.append(
                TOCEntry(
                    level=level,
                    title=title.strip(),
                    start_page=page,
                    end_page=end_page,
                )
            )

        # Build tree from flat list
        return self._build_tree(flat_entries)

    def _build_tree(self, flat_entries: list[TOCEntry]) -> list[TOCEntry]:
        root: list[TOCEntry] = []
        stack: list[TOCEntry] = []

        for entry in flat_entries:
            # Pop stack until we find parent level
            while stack and stack[-1].level >= entry.level:
                stack.pop()

            if stack:
                stack[-1].children.append(entry)
            else:
                root.append(entry)

            stack.append(entry)

        return root

    # --- Bytes-based methods (for R2 / in-memory processing) ---

    def extract_metadata_from_bytes(
        self, data: bytes, filename: str = "unknown.pdf"
    ) -> PDFMetadata:
        try:
            doc = pymupdf.open(stream=data, filetype="pdf")
            metadata = doc.metadata or {}
            total_pages = len(doc)
            title = metadata.get("title", "") or Path(filename).stem
            author = metadata.get("author") or None
            doc.close()
            return PDFMetadata(
                title=title.strip(),
                author=author.strip() if author else None,
                total_pages=total_pages,
            )
        except Exception as e:
            raise PDFProcessingError(str(e))

    def extract_toc_from_bytes(
        self, data: bytes, filename: str = "unknown.pdf"
    ) -> list[TOCEntry]:
        try:
            doc = pymupdf.open(stream=data, filetype="pdf")
            raw_toc = doc.get_toc()
            total_pages = len(doc)
            doc.close()
        except Exception as e:
            raise PDFProcessingError(str(e))

        if not raw_toc:
            raise NoTOCFoundError(filename)

        flat_entries: list[TOCEntry] = []
        for i, (level, title, page) in enumerate(raw_toc):
            if i + 1 < len(raw_toc):
                end_page = raw_toc[i + 1][2] - 1
                if end_page < page:
                    end_page = page
            else:
                end_page = total_pages

            flat_entries.append(
                TOCEntry(
                    level=level,
                    title=title.strip(),
                    start_page=page,
                    end_page=end_page,
                )
            )

        return self._build_tree(flat_entries)

    def extract_text_from_bytes(
        self, data: bytes, start_page: int, end_page: int
    ) -> str:
        try:
            logger.debug(
                "PDF extract_text_from_bytes start: pages=%s-%s",
                start_page,
                end_page,
            )
            doc = pymupdf.open(stream=data, filetype="pdf")
            pages_text: list[str] = []

            for page_num in range(start_page - 1, min(end_page, len(doc))):
                page = doc[page_num]
                text = page.get_text()
                if text.strip():
                    pages_text.append(text)

            if not pages_text:
                logger.info(
                    "No native text found, attempting OCR: pages=%s-%s",
                    start_page,
                    end_page,
                )
                for page_num in range(start_page - 1, min(end_page, len(doc))):
                    page = doc[page_num]
                    try:
                        tp = page.get_textpage_ocr(language="eng+jpn", dpi=300)
                        text = page.get_text(textpage=tp)
                        if text.strip():
                            pages_text.append(text)
                    except Exception as ocr_err:
                        logger.warning(
                            "OCR failed for page %s: %s", page_num + 1, ocr_err
                        )

            doc.close()
            full_text = "\n\n".join(pages_text)

            max_chars = 30000
            if len(full_text) > max_chars:
                full_text = full_text[:max_chars] + "\n\n[Text truncated]"

            logger.debug(
                "PDF extract_text_from_bytes done: chars=%s",
                len(full_text),
            )
            return full_text
        except Exception as e:
            raise PDFProcessingError(f"Text extraction failed: {e}")

    # --- File-path-based methods (for local storage) ---

    def extract_text(
        self, file_path: str, start_page: int, end_page: int
    ) -> str:
        try:
            logger.debug(
                "PDF extract_text start: file_path=%s pages=%s-%s",
                file_path,
                start_page,
                end_page,
            )
            doc = pymupdf.open(file_path)
            pages_text: list[str] = []
            use_ocr = False

            # pymupdf uses 0-based page indexing, our DB uses 1-based
            for page_num in range(start_page - 1, min(end_page, len(doc))):
                page = doc[page_num]
                text = page.get_text()
                if text.strip():
                    pages_text.append(text)

            # If no text extracted, try OCR fallback
            if not pages_text:
                logger.info(
                    "No native text found, attempting OCR: file_path=%s pages=%s-%s",
                    file_path,
                    start_page,
                    end_page,
                )
                use_ocr = True
                for page_num in range(start_page - 1, min(end_page, len(doc))):
                    page = doc[page_num]
                    try:
                        tp = page.get_textpage_ocr(language="eng+jpn", dpi=300)
                        text = page.get_text(textpage=tp)
                        if text.strip():
                            pages_text.append(text)
                    except Exception as ocr_err:
                        logger.warning(
                            "OCR failed for page %s: %s", page_num + 1, ocr_err
                        )

            doc.close()
            full_text = "\n\n".join(pages_text)

            # Truncate to ~30k chars to stay within LLM context limits
            max_chars = 30000
            if len(full_text) > max_chars:
                full_text = full_text[:max_chars] + "\n\n[Text truncated]"

            logger.debug(
                "PDF extract_text done: file_path=%s chars=%s ocr=%s",
                file_path,
                len(full_text),
                use_ocr,
            )
            return full_text
        except Exception as e:
            raise PDFProcessingError(f"Text extraction failed: {e}")
