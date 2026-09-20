from pathlib import Path
import os


def walk(codebase_path:Path,excluded_dirs:set[str],allowed_extensions:set[str],max_file_size) -> list[Path]:
    eligible_files : list[Path] = []
    max_file_size_in_kb = max_file_size * 1024
    for root, dirs, files in os.walk(codebase_path):
        dirs[:] = [d for d in dirs if d not in excluded_dirs]
        root_path = Path(root)
        for file in files:
            file_path = root_path / file
            if file_path.suffix.lower() not in allowed_extensions:
                continue
            try:
                if file_path.stat().st_size > max_file_size_in_kb:
                    continue
            except (FileNotFoundError, PermissionError):
                continue

            if  is_binary_file(file_path):
                continue
            eligible_files.append(file_path)

    return eligible_files


def is_binary_file(file_path: Path) -> bool:
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(1024)
            return b'\x00' in chunk
    except Exception:
        return True
