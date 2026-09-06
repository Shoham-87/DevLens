from pathlib import Path
import shutil
from git import Repo
import stat
import os

def clone(repo_url:str, github_access_token:str, connected_repo_id:str) -> Path:
    temporary_dir = Path(f"tmp/devlens-{connected_repo_id}")

    if temporary_dir.exists():
        shutil.rmtree(temporary_dir)

    temporary_dir.mkdir(parents=True, exist_ok=True)

    auth_url = _format_repo_url(repo_url,github_access_token)
    print("AUth URL",auth_url)

    print(f"Cloning repo into {temporary_dir}...")
    Repo.clone_from(auth_url, temporary_dir)
    print(f"Clone complete: {temporary_dir}")

    return temporary_dir

def _handle_readonly(func, path, exc_info):
    # Remove read-only attribute and retry the operation
    os.chmod(path, stat.S_IWRITE)
    func(path)
    
def cleanUp(directory_path:Path) -> None:
    if directory_path.exists() and directory_path.is_dir():
        shutil.rmtree(directory_path,onexc=_handle_readonly)
    print("Directory and all contents deleted.")


def _format_repo_url(repo_url: str, token: str) -> str:
    if repo_url.startswith("https://"):
        auth_url = repo_url.replace("https://", f"https://{token}@")
    else:
        raise ValueError("URL must start with https://")
    
    if not auth_url.endswith(".git"):
        auth_url += ".git"
        
    return auth_url