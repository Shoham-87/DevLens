from pathlib import Path

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

README_NAMES = ("readme.md", "readme.rst", "readme.txt", "readme")
MANIFEST_NAMES = (
    "requirements.txt", "pyproject.toml", "package.json", "pom.xml", "build.gradle",
    "build.gradle.kts", "go.mod", "cargo.toml", "composer.json", "gemfile",
    "dockerfile", "compose.yaml", "docker-compose.yml", "docker-compose.yaml",
)
MAX_TREE_LINES = 400
MAX_PROMPT_CHARS = 24000

OVERVIEW_PROMPT = """You are a senior software architect. Using ONLY the material provided about a repository,
write a concise technical overview in Markdown with these sections:

## Purpose
## Tech stack
## Architecture & data flow   (main modules/layers, how a request or job moves through them, citing file paths)
## Key files                 (most important files and what each does)
## Weak spots & improvement opportunities   (missing tests, error handling, security, performance,
                             duplication, configuration, scalability - cite file paths; be specific)

Stay under 700 words. Do not invent files or features that are not in the material."""


def build_file_tree(files: list[Path], root: Path) -> str:
    paths = sorted(f.relative_to(root).as_posix() for f in files)
    if len(paths) > MAX_TREE_LINES:
        paths = paths[:MAX_TREE_LINES] + [f"... ({len(paths) - MAX_TREE_LINES} more files)"]
    return "\n".join(paths)


def read_capped(path: Path, limit: int) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:limit]
    except Exception:
        return ""


def find_top_level(root: Path, names: tuple[str, ...]) -> list[Path]:
    found = []
    candidates = list(root.iterdir()) + [
        p for d in root.iterdir() if d.is_dir() and not d.name.startswith(".")
        for p in d.iterdir()
    ]
    for p in candidates:
        if p.is_file() and p.name.lower() in names:
            found.append(p)
    return found


def gather_material(root: Path, file_tree: str, file_summaries: list[dict]) -> str:
    parts = [f"# File tree\n{file_tree}"]

    for readme in find_top_level(root, README_NAMES)[:2]:
        parts.append(f"# {readme.relative_to(root).as_posix()}\n{read_capped(readme, 5000)}")

    for manifest in find_top_level(root, MANIFEST_NAMES)[:6]:
        parts.append(f"# {manifest.relative_to(root).as_posix()}\n{read_capped(manifest, 2500)}")

    material = "\n\n".join(parts)
    summaries = []
    budget = MAX_PROMPT_CHARS - len(material)
    for s in file_summaries:
        text = s["content"][:1200]
        if budget - len(text) < 0:
            summaries.append("... (more files omitted)")
            break
        summaries.append(text)
        budget -= len(text)
    if summaries:
        material += "\n\n# Per-file summaries\n" + "\n\n".join(summaries)
    return material[:MAX_PROMPT_CHARS]


async def generate_overview(root: Path, files: list[Path], file_summaries: list[dict],
                            groq_key: str, model: str) -> tuple[str, str]:
    file_tree = build_file_tree(files, root)
    material = gather_material(root, file_tree, file_summaries)
    try:
        llm = ChatGroq(model=model, api_key=groq_key, temperature=0)
        response = await llm.ainvoke([
            SystemMessage(content=OVERVIEW_PROMPT),
            HumanMessage(content=material),
        ])
        overview = (response.content or "").strip()
        if overview:
            return overview, file_tree
    except Exception as e:
        print(f"Overview generation failed, storing raw material instead: {e}")
    return material[:12000], file_tree
