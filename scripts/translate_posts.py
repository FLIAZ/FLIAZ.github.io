#!/usr/bin/env python3
"""Generate English page bundles from Chinese sources using Google Translate.

The translation happens at build time, so no API key or backend is shipped to
the browser. A hand-written ``index.en.md`` always wins; generated pages carry
``machine_translated: true`` so they can be identified (and cleaned) later.

Google's public web endpoint is used instead of the paid Cloud Translation
API. It is available from GitHub Actions runners, accepts a few thousand
characters per request, and needs no credentials.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

CACHE_VERSION = "google-zh-en-v2"
SCRIPT_FINGERPRINT = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
CJK_RE = re.compile(r"[\u3400-\u9fff]")
GOOGLE_ENDPOINTS = (
    "https://translate.googleapis.com/translate_a/single",
    "https://translate.google.com/translate_a/single",
)
GOOGLE_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

GLOSSARY = {
    "网站搭建教程": "website setup tutorial",
    "网站搭建": "website setup",
    "本地网页": "local web page",
    "本地建站": "local site setup",
    "云端建站": "cloud site setup",
    "本地与服务器": "local and server",
    "再次联合查询": "union query again",
    "查询数据库名": "query the database name",
    "联合查询爆出": "union query to extract",
    "继续爆": "continue to extract",
    "爆列名": "extract column names",
    "爆表名": "extract table names",
    "爆数据": "extract data",
    "数据库名": "database name",
    "用户信息": "user information",
    "名为": "named",
    "版本": "version",
    "列名": "column name",
    "题目提示": "The challenge indicates",
    "得到": "to obtain",
    "题目环境": "challenge environment",
    "文件上传": "file upload",
    "文件包含": "file inclusion",
    "命令执行": "command execution",
    "联合查询": "union query",
    "万能密码": "universal password",
    "登录系统": "login system",
    "云服务器": "cloud server",
    "关注方向": "focus areas",
    "用户名": "username",
    "数据库": "database",
    "注入点": "injection point",
    "知识点": "concepts",
    "库名": "database name",
    "表名": "table name",
    "字段名": "column name",
    "字段": "column",
    "爆字段": "extract columns",
    "爆库": "extract database",
    "爆表": "extract table",
    "爆出": "extract",
    "回显": "echo",
    "公钥": "public key",
    "私钥": "private key",
    "题解": "writeup",
    "题目": "challenge",
    "环境": "environment",
    "建站": "site setup",
    "教程": "tutorial",
    "笔记": "notes",
    "相册": "album",
    "关于": "about",
    "小伙伴们": "friends",
    "归档": "archives",
    "标签": "tags",
    "首页": "home",
    "搜索": "search",
    "近况": "recent updates",
    "服务器": "server",
    "本地": "local",
    "云端": "cloud",
    "网页": "web page",
    "网站": "website",
    "图片": "image",
    "截图": "screenshot",
    "思路": "approach",
    "完整": "complete",
    "保留": "keep",
    "密码": "password",
}

TERM_FIXES = {
    "BUCTF": "BUUCTF",
    "New Star CTF": "NewStarCTF",
    "subject environment": "challenge environment",
    "subject type": "challenge type",
    "document upload": "file upload",
    "joint query": "union query",
    "Self-Query": "select query",
    "Local Stations": "local site",
    "Cloud Stations": "cloud site",
}

FENCE_RE = re.compile(r"^(\s*)(`{3,}|~{3,})(.*)$")
HEADING_RE = re.compile(r"^(\s*#{1,6}\s+)(.*?)(\s*#*\s*)$")
LIST_RE = re.compile(r"^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$")
QUOTE_RE = re.compile(r"^(\s*(?:>\s*)+)(.*)$")
FOOTNOTE_RE = re.compile(r"^(\s*\[\^[^\]]+\]:\s*)(.*)$")
REF_LINK_RE = re.compile(r"^\s*\[[^\]]+\]:\s+\S+")
RULE_RE = re.compile(r"^\s*([-*_])(?:\s*\1){2,}\s*$")
RAW_HTML_RE = re.compile(r"^\s*<[^>]+>\s*$")
SHORTCODE_RE = re.compile(r"^\s*\{\{[<%].*?[>%]\}\}\s*$")

TOKEN_RE = re.compile(
    r"(`+[^`\n]*`+"
    r"|!\[[^\]\n]*\]\([^)\n]+\)"
    r"|\[[^\]\n]*\]\([^)\n]+\)"
    r"|<https?://[^>\s]+>"
    r"|<[^>\n]+>"
    r"|\{\{[<%].*?[>%]\}\}"
    r"|\$[^$\n]+\$"
    r"|\\\([^)\n]+\\\)"
    r"|\*\*[^*\n]+\*\*"
    r"|__[^_\n]+__"
    r"|~~[^~\n]+~~"
    r"|\*[^*\n]+\*"
    r"|_[^_\n]+_"
    r"|[A-Za-z_][A-Za-z0-9_]*(?:_[A-Za-z0-9_]+)+(?:\.[A-Za-z_][A-Za-z0-9_]*)*"
    r"|[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)"
)

IMAGE_RE = re.compile(r"^!\[(.*?)\]\((.*?)\)$")
LINK_RE = re.compile(r"^\[(.*?)\]\((.*?)\)$")
MAX_REQUEST_CHARS = 1200
MAX_BATCH_ENCODED = 6000
MAX_BATCH_ITEMS = 40


def split_frontmatter(text: str) -> tuple[dict, str]:
    """Return YAML front matter and Markdown body."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if not text.startswith("---\n"):
        raise ValueError("missing YAML front matter")
    end = text.find("\n---\n", 4)
    if end == -1:
        raise ValueError("unterminated YAML front matter")
    meta = yaml.safe_load(text[4:end])
    if not isinstance(meta, dict):
        raise ValueError("front matter is not a mapping")
    return meta, text[end + 5 :]


def dump_page(meta: dict, body: str) -> str:
    yaml_text = yaml.safe_dump(
        meta,
        allow_unicode=True,
        sort_keys=False,
        default_flow_style=False,
    ).strip()
    return f"---\n{yaml_text}\n---\n\n{body.lstrip(chr(10))}"


def is_generated(target: Path) -> bool:
    try:
        meta, _ = split_frontmatter(target.read_text(encoding="utf-8"))
        return bool(meta.get("machine_translated"))
    except Exception:
        return False


def apply_glossary(text: str) -> str:
    terms = sorted(GLOSSARY, key=len, reverse=True)
    pattern = re.compile("|".join(re.escape(term) for term in terms))
    output: list[str] = []
    position = 0

    for match in pattern.finditer(text):
        if match.start() > position:
            output.append(text[position : match.start()])

        english = GLOSSARY[match.group(0)]
        if output:
            previous = output[-1]
            if (
                previous
                and previous[-1].isalnum()
                and english
                and english[0].isalnum()
            ):
                output.append(" ")
        output.append(english)

        following = text[match.end() : match.end() + 1]
        if following and (CJK_RE.match(following) or following.isalnum()):
            output.append(" ")
        position = match.end()

    if position < len(text):
        output.append(text[position:])

    return "".join(output)


def apply_fixes(text: str) -> str:
    for source, target in TERM_FIXES.items():
        if source.isascii():
            text = re.sub(rf"\b{re.escape(source)}\b", target, text)
        else:
            text = text.replace(source, target)

    for source, target in {
        "，": ", ",
        "。": ". ",
        "；": "; ",
        "：": ": ",
        "！": "! ",
        "？": "? ",
        "、": ", ",
    }.items():
        text = text.replace(source, target)

    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    return text


def join_inline_parts(parts: list[str]) -> str:
    """Keep spaces readable around inline code and emphasis tokens."""
    output = ""
    no_space_before = set(")]},.;:!?。，！？；：、=(")
    no_space_after = set("([{")
    for part in parts:
        if not part:
            continue
        if output:
            left = output[-1]
            right = part[0]
            if (
                not left.isspace()
                and not right.isspace()
                and left not in no_space_after
                and right not in no_space_before
            ):
                output += " "
        output += part
    return output


def split_for_google(text: str) -> list[str]:
    """Keep individual web requests below Google's practical URL limit."""
    if len(text) <= MAX_REQUEST_CHARS:
        return [text]

    chunks: list[str] = []
    current = ""
    for piece in re.split(r"(?<=[。！？；!?;，,])", text):
        if not piece:
            continue
        while len(piece) > MAX_REQUEST_CHARS:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(piece[:MAX_REQUEST_CHARS])
            piece = piece[MAX_REQUEST_CHARS:]
        if current and len(current) + len(piece) > MAX_REQUEST_CHARS:
            chunks.append(current)
            current = piece
        else:
            current += piece
    if current:
        chunks.append(current)
    return chunks or [text]


class GoogleTranslator:
    def __init__(self, delay: float = 0.12) -> None:
        self.delay = delay
        self.cache: dict[str, str] = {}
        self.requests = 0

    def translate_texts(self, texts: list[str]) -> list[str]:
        """Translate several independent strings, batching web requests.

        Each string is sent as its own ``q`` parameter, so the translations
        keep their one-to-one association with the source fragments.
        """
        lookup: dict[str, str] = {}
        pending: list[str] = []

        for text in texts:
            if not text.strip() or not CJK_RE.search(text):
                lookup[text] = text
                continue

            prepared = apply_glossary(text)
            if not CJK_RE.search(prepared):
                lookup[text] = apply_fixes(prepared)
                continue

            if prepared in self.cache:
                lookup[text] = self.cache[prepared]
                continue

            pending.append(prepared)

        unique = list(dict.fromkeys(pending))
        long_texts: list[str] = []
        batchable: list[str] = []
        for prepared in unique:
            if len(urllib.parse.quote(prepared)) > MAX_BATCH_ENCODED:
                long_texts.append(prepared)
            else:
                batchable.append(prepared)

        for prepared in long_texts:
            if prepared in self.cache:
                continue
            translated = " ".join(
                self.request(chunk) for chunk in split_for_google(prepared)
            )
            self.cache[prepared] = apply_fixes(translated.strip())

        for chunk in self.batch_chunks(batchable):
            outputs = self.request_batch(chunk)
            for prepared, output in zip(chunk, outputs):
                self.cache[prepared] = apply_fixes(output.strip())

        result: list[str] = []
        for text in texts:
            if text in lookup:
                result.append(lookup[text])
            else:
                prepared = apply_glossary(text)
                result.append(self.cache.get(prepared, text))
        return result

    def translate_text(self, text: str) -> str:
        return self.translate_texts([text])[0]

    def batch_chunks(self, texts: list[str]) -> list[list[str]]:
        chunks: list[list[str]] = []
        current: list[str] = []
        size = 0
        for text in texts:
            cost = len(urllib.parse.quote(text)) + 4
            if current and (size + cost > MAX_BATCH_ENCODED or len(current) >= MAX_BATCH_ITEMS):
                chunks.append(current)
                current = []
                size = 0
            current.append(text)
            size += cost
        if current:
            chunks.append(current)
        return chunks

    def fetch(self, encoded_params: str) -> object:
        last_error: Exception | None = None

        for attempt in range(4):
            for endpoint in GOOGLE_ENDPOINTS:
                url = f"{endpoint}?{encoded_params}"
                request = urllib.request.Request(
                    url,
                    headers={"User-Agent": GOOGLE_USER_AGENT, "Accept": "application/json"},
                )
                try:
                    with urllib.request.urlopen(request, timeout=30) as response:
                        return json.loads(response.read().decode("utf-8"))
                except (urllib.error.URLError, urllib.error.HTTPError, ValueError, json.JSONDecodeError) as exc:
                    last_error = exc
                    # Try the other Google host before backing off.
                    continue
            if attempt < 3:
                time.sleep(2 ** attempt)

        raise RuntimeError(f"Google Translate failed after retries: {last_error}")

    def count_request(self) -> None:
        self.requests += 1
        if self.delay:
            time.sleep(self.delay)

    def request(self, text: str) -> str:
        params = urllib.parse.urlencode(
            {
                "client": "gtx",
                "sl": "zh-CN",
                "tl": "en",
                "dt": "t",
                "q": text,
            }
        )
        payload = self.fetch(params)
        output = "".join(
            part[0]
            for part in payload[0]
            if part and isinstance(part, list) and part[0]
        ).strip()
        if not output:
            raise ValueError("empty translation")
        self.count_request()
        return html.unescape(output)

    def request_batch(self, texts: list[str]) -> list[str]:
        if not texts:
            return []
        if len(texts) == 1:
            return [self.request(texts[0])]

        params: list[tuple[str, str]] = [
            ("client", "gtx"),
            ("sl", "zh-CN"),
            ("tl", "en"),
        ]
        params.extend(("q", text) for text in texts)
        payload = self.fetch(urllib.parse.urlencode(params))

        outputs: list[str] | None = None
        if isinstance(payload, str):
            outputs = [payload]
        elif isinstance(payload, list) and all(isinstance(item, str) for item in payload):
            outputs = payload
        elif isinstance(payload, list) and all(
            isinstance(item, list) and item and isinstance(item[0], str)
            for item in payload
        ):
            outputs = [
                "".join(part[0] for part in item if part and isinstance(part, list) and part[0])
                for item in payload
            ]

        if not outputs or len(outputs) != len(texts) or any(not item.strip() for item in outputs):
            return [self.request(text) for text in texts]

        self.count_request()
        return [html.unescape(item) for item in outputs]

    def translate_inline(self, text: str) -> str:
        if not text:
            return text

        parts: list[str | None] = []
        segments: list[str] = []
        position = 0
        for match in TOKEN_RE.finditer(text):
            if match.start() > position:
                parts.append(None)
                segments.append(text[position : match.start()])
            parts.append(self.translate_token(match.group(0)))
            position = match.end()
        if position < len(text):
            parts.append(None)
            segments.append(text[position:])

        translations = iter(self.translate_texts(segments))
        return join_inline_parts(
            [next(translations) if part is None else part for part in parts]
        )

    def translate_token(self, token: str) -> str:
        if token.startswith("`"):
            return token

        image = IMAGE_RE.match(token)
        if image:
            return f"![{self.translate_inline(image.group(1))}]({image.group(2)})"

        link = LINK_RE.match(token)
        if link:
            return f"[{self.translate_inline(link.group(1))}]({link.group(2)})"

        for marker in ("**", "__", "~~", "*", "_"):
            if token.startswith(marker) and token.endswith(marker) and len(token) > len(marker) * 2:
                inner = token[len(marker) : -len(marker)]
                return f"{marker}{self.translate_inline(inner)}{marker}"

        # Inline HTML, math, shortcodes and autolinks stay byte-for-byte intact.
        return token

    def translate_term(self, term: str) -> str:
        translated = self.translate_text(term)
        return translated.strip() or term


def cache_paths(source: Path, cache_dir: Path) -> tuple[Path, Path]:
    relative_key = "/".join(source.parts[-4:])
    cache_file = cache_dir / "pages" / f"{hashlib.sha256(relative_key.encode()).hexdigest()}.md"
    return cache_file, cache_file.with_suffix(".sha256")


def translate_table_row(line: str, translator: GoogleTranslator) -> str:
    cells = line.split("|")
    translated_cells: list[str] = []
    for cell in cells:
        stripped = cell.strip()
        if not stripped or re.fullmatch(r":?-{3,}:?", stripped):
            translated_cells.append(cell)
            continue
        leading = cell[: len(cell) - len(cell.lstrip())]
        trailing = cell[len(cell.rstrip()) :]
        translated_cells.append(f"{leading}{translator.translate_inline(stripped)}{trailing}")
    return "|".join(translated_cells)


def translate_markdown(body: str, translator: GoogleTranslator) -> str:
    lines = body.split("\n")
    output: list[str] = []
    fence_char: str | None = None
    fence_length = 0

    for line in lines:
        if fence_char:
            output.append(line)
            if re.match(rf"^\s*{re.escape(fence_char)}{{{fence_length},}}\s*$", line):
                fence_char = None
                fence_length = 0
            continue

        fence = FENCE_RE.match(line)
        if fence:
            fence_char = fence.group(2)[0]
            fence_length = len(fence.group(2))
            output.append(line)
            continue

        if not line.strip():
            output.append(line)
            continue

        # Pure ASCII lines (SQL, flags, URLs, English text) need no translation.
        # Returning them untouched also preserves copy-pasteable command syntax.
        if not CJK_RE.search(line):
            output.append(line)
            continue

        if RULE_RE.match(line) or SHORTCODE_RE.match(line) or RAW_HTML_RE.match(line):
            output.append(line)
            continue

        if line.lstrip().startswith("<!--") or REF_LINK_RE.match(line) or line.lstrip().startswith("$$"):
            output.append(line)
            continue

        if line.lstrip().startswith("|"):
            output.append(translate_table_row(line, translator))
            continue

        heading = HEADING_RE.match(line)
        if heading:
            output.append(
                f"{heading.group(1)}{translator.translate_inline(heading.group(2))}{heading.group(3)}"
            )
            continue

        quote = QUOTE_RE.match(line)
        if quote:
            output.append(f"{quote.group(1)}{translator.translate_inline(quote.group(2))}")
            continue

        footnote = FOOTNOTE_RE.match(line)
        if footnote:
            output.append(f"{footnote.group(1)}{translator.translate_inline(footnote.group(2))}")
            continue

        item = LIST_RE.match(line)
        if item:
            output.append(f"{item.group(1)}{translator.translate_inline(item.group(2))}")
            continue

        translated_line = translator.translate_inline(line)
        if translated_line and translated_line[0].islower():
            translated_line = translated_line[0].upper() + translated_line[1:]
        output.append(translated_line)

    return "\n".join(output)


def translate_meta(meta: dict, translator: GoogleTranslator) -> dict:
    translated = dict(meta)
    for key in ("title", "description"):
        value = translated.get(key)
        if isinstance(value, str) and value.strip():
            translated[key] = translator.translate_term(value)

    for key in ("categories", "tags"):
        value = translated.get(key)
        if isinstance(value, list):
            translated[key] = [
                translator.translate_term(item) if isinstance(item, str) else item
                for item in value
            ]

    translated["machine_translated"] = True
    return translated


def find_sources(root: Path) -> list[Path]:
    content = root / "content"
    sources: list[Path] = []
    for section in ("post", "page"):
        base = content / section
        if base.exists():
            sources.extend(base.rglob("index.zh.md"))
    return sorted(set(sources))


def write_generated(
    source: Path,
    target: Path,
    cache_dir: Path,
    translator: GoogleTranslator | None,
    force: bool = False,
) -> bool:
    source_text = source.read_text(encoding="utf-8")
    digest = hashlib.sha256(f"{CACHE_VERSION}\0{SCRIPT_FINGERPRINT}\0{source_text}".encode("utf-8")).hexdigest()
    cache_file, cache_hash = cache_paths(source, cache_dir)

    if not force and cache_file.exists() and cache_hash.exists():
        if cache_hash.read_text(encoding="utf-8").strip() == digest:
            target.write_text(cache_file.read_text(encoding="utf-8"), encoding="utf-8")
            return False

    if translator is None:
        raise RuntimeError("Google Translate is required for this page")

    meta, body = split_frontmatter(source_text)
    output = dump_page(
        translate_meta(meta, translator),
        translate_markdown(body, translator),
    )

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(output, encoding="utf-8")
    cache_hash.write_text(digest + "\n", encoding="utf-8")
    target.write_text(output, encoding="utf-8")
    return True


def clean_generated(root: Path) -> int:
    removed = 0
    for source in find_sources(root):
        target = source.with_name("index.en.md")
        if target.exists() and is_generated(target):
            target.unlink()
            removed += 1
    return removed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repository root (default: the parent of scripts/)",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=None,
        help="cache directory (default: <root>/.translation-cache)",
    )
    parser.add_argument("--force", action="store_true", help="ignore cached translations")
    parser.add_argument("--clean", action="store_true", help="remove generated index.en.md files")
    parser.add_argument("--dry-run", action="store_true", help="show what would be translated")
    parser.add_argument("--limit", type=int, default=0, help="process at most N pages")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    root = args.root.resolve()
    cache_dir = (args.cache_dir or root / ".translation-cache").resolve()

    if args.clean:
        removed = clean_generated(root)
        print(f"removed {removed} generated English file(s)")
        return 0

    pending: list[tuple[Path, Path]] = []
    for source in find_sources(root):
        target = source.with_name("index.en.md")
        if target.exists() and not is_generated(target):
            if args.verbose:
                print(f"keep manual: {target.relative_to(root)}")
            continue
        pending.append((source, target))
        if args.limit and len(pending) >= args.limit:
            break

    if not pending:
        print("no English pages need generation")
        return 0

    print(f"pages to process: {len(pending)}")
    if args.dry_run:
        for source, target in pending:
            print(f"  {source.relative_to(root)} -> {target.relative_to(root)}")
        return 0

    translator: GoogleTranslator | None = None
    for source, _ in pending:
        source_text = source.read_text(encoding="utf-8")
        digest = hashlib.sha256(f"{CACHE_VERSION}\0{SCRIPT_FINGERPRINT}\0{source_text}".encode("utf-8")).hexdigest()
        cache_file, cache_hash = cache_paths(source, cache_dir)
        if args.force or not cache_file.exists() or not cache_hash.exists():
            translator = GoogleTranslator()
            break
        if cache_hash.read_text(encoding="utf-8").strip() != digest:
            translator = GoogleTranslator()
            break

    generated = 0
    failures = 0
    for source, target in pending:
        try:
            changed = write_generated(source, target, cache_dir, translator, force=args.force)
            generated += 1
            print(f"{'translated' if changed else 'cached'}: {target.relative_to(root)}", flush=True)
        except Exception as exc:
            failures += 1
            print(f"error: {source.relative_to(root)}: {exc}", file=sys.stderr, flush=True)

    if translator:
        print(f"Google requests: {translator.requests}")
    print(f"generated {generated} page(s), {failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
