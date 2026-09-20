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
    ".ts":   Language(tree_sitter_typescript.language_typescript()),
    ".go":   Language(tree_sitter_go.language()),
    ".rs":   Language(tree_sitter_rust.language()),
    ".cs":   Language(tree_sitter_c_sharp.language()),
    ".kt":   Language(tree_sitter_kotlin.language()),
}

QUERY_MAP = {
    ".java": """
        (method_declaration) @method
        (constructor_declaration) @constructor
    """,
    ".py": """
        (function_definition) @function
    """,
    ".js": """
        (function_declaration) @function
        (method_definition) @method
    """,
    ".ts": """
        (function_declaration) @function
        (method_definition) @method
    """,
    ".go": """
        (function_declaration) @function
        (method_declaration) @method
    """,
    ".rs": """
        (function_item) @function
    """,
    ".cs": """
        (method_declaration) @method
    """,
    ".kt": """
        (function_declaration) @function
    """
}

PARSER_MAP = {
    ext: Parser(lang) for ext, lang in LANGUAGE_MAP.items()
}

QUERY_CACHE = {
    ext: Query(LANGUAGE_MAP[ext], QUERY_MAP[ext])
    for ext in QUERY_MAP
}

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
    relative_path = str(file_path.relative_to(repo_root))
    lang_name = extension.replace(".", "")
    chunk_index = 1
    for tag, nodes in captures.items():
        for node in nodes:
            chunk_data  = {
                "content": source_code[node.start_byte:node.end_byte].decode('utf-8', errors='replace'),
                "file_path": relative_path,
                "line_start": node.start_point.row + 1,
                "line_end": node.end_point.row + 1,
                "language": lang_name,
                "chunk_type": tag, 
                "repo_id": repo_id,
                "chunk_index": chunk_index
            }
            print(chunk_data)
            chunks.append(chunk_data)
            chunk_index += 1

    chunks.sort(key=lambda c: c["line_start"])
    return chunks

def _sliding_window_chunks(file_path: Path, repo_root: Path, repo_id: str,
                            window: int = 60, overlap: int = 10) -> List[Dict[str, Any]]:
    try:
        lines = file_path.read_text(encoding='utf-8', errors='replace').splitlines()
    except Exception:
        return []
    
    relative_path = str(file_path.relative_to(repo_root))
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
