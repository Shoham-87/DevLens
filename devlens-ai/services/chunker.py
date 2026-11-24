import re
from bisect import bisect_right
import tree_sitter_java, tree_sitter_python, tree_sitter_javascript
import tree_sitter_typescript, tree_sitter_go, tree_sitter_rust
import tree_sitter_c_sharp, tree_sitter_kotlin
from tree_sitter import Language, Parser, Query, QueryCursor
from pathlib import Path
from typing import List, Dict, Any

LANGUAGE_MAP = {
    ".java": Language(tree_sitter_java.language()),
    ".py":   Language(tree_sitter_python.language()),
    ".js":   Language(tree_sitter_javascript.language()),
    ".jsx":  Language(tree_sitter_javascript.language()),
    ".ts":   Language(tree_sitter_typescript.language_typescript()),
    ".tsx":  Language(tree_sitter_typescript.language_tsx()),
    ".go":   Language(tree_sitter_go.language()),
    ".rs":   Language(tree_sitter_rust.language()),
    ".cs":   Language(tree_sitter_c_sharp.language()),
    ".kt":   Language(tree_sitter_kotlin.language()),
}

QUERY_MAP = {
    ".java": """
        (method_declaration) @method
        (constructor_declaration) @constructor
        (class_declaration) @class
        (interface_declaration) @class
        (enum_declaration) @class
    """,
    ".py": """
        (function_definition) @function
        (class_definition) @class
    """,
    ".js": """
        (function_declaration) @function
        (method_definition) @method
        (class_declaration) @class
    """,
    ".jsx": """
        (function_declaration) @function
        (method_definition) @method
        (class_declaration) @class
    """,
    ".ts": """
        (function_declaration) @function
        (method_definition) @method
        (class_declaration) @class
        (abstract_class_declaration) @class
        (interface_declaration) @class
        (enum_declaration) @class
    """,
    ".tsx": """
        (function_declaration) @function
        (method_definition) @method
        (class_declaration) @class
        (abstract_class_declaration) @class
        (interface_declaration) @class
        (enum_declaration) @class
    """,
    ".go": """
        (function_declaration) @function
        (method_declaration) @method
        (type_declaration) @class
    """,
    ".rs": """
        (function_item) @function
        (struct_item) @class
        (enum_item) @class
        (trait_item) @class
    """,
    ".cs": """
        (method_declaration) @method
        (constructor_declaration) @constructor
        (class_declaration) @class
        (interface_declaration) @class
        (enum_declaration) @class
        (struct_declaration) @class
    """,
    ".kt": """
        (function_declaration) @function
        (class_declaration) @class
        (object_declaration) @class
    """
}

PARSER_MAP = {
    ext: Parser(lang) for ext, lang in LANGUAGE_MAP.items()
}

QUERY_CACHE = {
    ext: Query(LANGUAGE_MAP[ext], QUERY_MAP[ext])
    for ext in QUERY_MAP
}

MAX_CHUNK_LINES = 150
SPLIT_WINDOW = 120
SPLIT_OVERLAP = 20
MAX_CLASS_HEADER_LINES = 80
MODULE_CHUNK_LINES = 60
IMPORT_PATTERN = re.compile(r"^\s*(import |from \S+ import |using |package |#include|require\(|use |const \w+ = require\()")

def chunk(file_path:Path,repo_root: Path,repo_id: str) ->List[Dict[str, Any]]:
    extension = file_path.suffix.lower()
    if extension not in LANGUAGE_MAP:
        return _sliding_window_chunks(file_path, repo_root, repo_id)

    parser = PARSER_MAP[extension]
    try:
        source_code = file_path.read_bytes()
    except Exception as e:
        print(f"Failed to read {file_path}: {e}")
        return []

    tree = parser.parse(source_code)

    captures = QueryCursor(QUERY_CACHE[extension]).captures(tree.root_node)

    chunks = []
    relative_path = file_path.relative_to(repo_root).as_posix()
    lang_name = extension.replace(".", "")
    lines = source_code.decode('utf-8', errors='replace').splitlines()
    covered = [False] * (len(lines) + 2)
    newline_offsets = [i for i, byte in enumerate(source_code) if byte == 10]

    function_nodes = []
    class_nodes = []
    for tag, nodes in captures.items():
        for node in nodes:
            if node.parent is not None and node.parent.type == "decorated_definition":
                node = node.parent
            if tag == "class":
                class_nodes.append((tag, node))
            else:
                function_nodes.append((tag, node))

    function_nodes.sort(key=lambda item: (item[1].start_byte, -item[1].end_byte))
    last_end = -1
    for tag, node in function_nodes:
        if node.start_byte < last_end:
            continue
        last_end = node.end_byte
        line_start = line_number(newline_offsets, node.start_byte)
        line_end = line_number(newline_offsets, max(node.end_byte - 1, node.start_byte))
        for line_no in range(line_start, line_end + 1):
            covered[line_no] = True
        content = source_code[node.start_byte:node.end_byte].decode('utf-8', errors='replace')
        if line_end - line_start + 1 > MAX_CHUNK_LINES:
            for part, part_start, part_end in split_lines(content.splitlines(), line_start):
                chunks.append(build_chunk(part, relative_path, part_start, part_end, lang_name, tag, repo_id))
        else:
            chunks.append(build_chunk(content, relative_path, line_start, line_end, lang_name, tag, repo_id))

    function_starts = sorted(line_number(newline_offsets, node.start_byte) for _, node in function_nodes)
    for tag, node in class_nodes:
        line_start = line_number(newline_offsets, node.start_byte)
        line_end = line_number(newline_offsets, max(node.end_byte - 1, node.start_byte))
        first_member = next((s for s in function_starts if line_start < s <= line_end), None)
        header_end = first_member - 1 if first_member else line_end
        header_end = min(header_end, line_start + MAX_CLASS_HEADER_LINES - 1)
        header_lines = lines[line_start - 1:header_end]
        while header_lines and not header_lines[-1].strip():
            header_lines.pop()
            header_end -= 1
        if not header_lines:
            continue
        for line_no in range(line_start, header_end + 1):
            covered[line_no] = True
        content = "\n".join(header_lines)
        if first_member:
            content += "\n    ..."
        chunks.append(build_chunk(content, relative_path, line_start, header_end, lang_name, tag, repo_id))

    for content, line_start, line_end in module_chunks(lines, covered):
        chunks.append(build_chunk(content, relative_path, line_start, line_end, lang_name, "module", repo_id))

    if not chunks:
        return _sliding_window_chunks(file_path, repo_root, repo_id)

    chunks.sort(key=lambda c: c["line_start"])
    chunk_index = 1
    for chunk_data in chunks:
        chunk_data["chunk_index"] = chunk_index
        chunk_index += 1
    return chunks

def line_number(newline_offsets: List[int], byte_offset: int) -> int:
    return bisect_right(newline_offsets, byte_offset - 1) + 1

def build_chunk(content: str, file_path: str, line_start: int, line_end: int,
                language: str, chunk_type: str, repo_id: str) -> Dict[str, Any]:
    return {
        "content": content,
        "file_path": file_path,
        "line_start": line_start,
        "line_end": line_end,
        "language": language,
        "chunk_type": chunk_type,
        "repo_id": repo_id
    }

def split_lines(lines: List[str], first_line: int):
    step = SPLIT_WINDOW - SPLIT_OVERLAP
    for offset in range(0, len(lines), step):
        part = lines[offset:offset + SPLIT_WINDOW]
        yield "\n".join(part), first_line + offset, first_line + offset + len(part) - 1
        if offset + SPLIT_WINDOW >= len(lines):
            break

def module_chunks(lines: List[str], covered: List[bool]):
    segment = []
    segment_start = None
    segment_end = None
    previous_line = None
    count = 0
    for line_no, text in enumerate(lines, start=1):
        if covered[line_no] or not text.strip():
            continue
        if segment_start is None:
            segment_start = line_no
        elif line_no != previous_line + 1:
            segment.append("...")
        segment.append(text)
        segment_end = line_no
        previous_line = line_no
        count += 1
        if count >= MODULE_CHUNK_LINES:
            yield "\n".join(segment), segment_start, segment_end
            segment, segment_start, previous_line, count = [], None, None, 0
    if segment:
        yield "\n".join(segment), segment_start, segment_end

def _sliding_window_chunks(file_path: Path, repo_root: Path, repo_id: str,
                            window: int = 60, overlap: int = 10) -> List[Dict[str, Any]]:
    try:
        lines = file_path.read_text(encoding='utf-8', errors='replace').splitlines()
    except Exception:
        return []

    relative_path = file_path.relative_to(repo_root).as_posix()
    lang_name = file_path.suffix.replace(".", "")
    chunks = []
    step = window - overlap
    for i, start in enumerate(range(0, len(lines), step)):
        end = min(start + window, len(lines))
        content = "\n".join(lines[start:end])
        if content.strip():
            chunks.append({
                "content": content,
                "file_path": relative_path,
                "line_start": start + 1,
                "line_end": end,
                "language": lang_name,
                "chunk_type": "window",
                "repo_id": repo_id,
                "chunk_index": i + 1
            })
        if end == len(lines):
            break
    return chunks

def summarize_file(file_path: Path, repo_root: Path, repo_id: str,
                   file_chunks: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    try:
        lines = file_path.read_text(encoding='utf-8', errors='replace').splitlines()
    except Exception:
        return None
    if not any(line.strip() for line in lines):
        return None

    relative_path = file_path.relative_to(repo_root).as_posix()
    imports = [line.strip() for line in lines if IMPORT_PATTERN.match(line)][:25]

    symbols = []
    for chunk_data in file_chunks:
        if chunk_data["chunk_type"] in ("module", "window"):
            continue
        signature = next(
            (line.strip() for line in chunk_data["content"].splitlines()
             if line.strip() and not line.strip().startswith(("@", "#", "//", "/*", "*"))),
            None
        )
        if signature:
            symbols.append(f"- [{chunk_data['chunk_type']}] {signature[:160]} (line {chunk_data['line_start']})")
    symbols = list(dict.fromkeys(symbols))[:40]

    parts = [
        f"File summary: {relative_path}",
        f"Language: {file_path.suffix.replace('.', '') or 'unknown'} | Lines: {len(lines)}"
    ]
    if imports:
        parts.append("Imports / dependencies:\n" + "\n".join(imports))
    if symbols:
        parts.append("Defines:\n" + "\n".join(symbols))
    else:
        preview = [line for line in lines if line.strip()][:15]
        parts.append("Preview:\n" + "\n".join(preview))

    return {
        "content": "\n".join(parts),
        "file_path": relative_path,
        "line_start": 1,
        "line_end": max(len(lines), 1),
        "language": file_path.suffix.replace(".", ""),
        "chunk_type": "file_summary",
        "repo_id": repo_id,
        "chunk_index": 0
    }
