import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRepoFile, getRepoTree } from '../../services/repoService.js';

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'pdf', 'zip', 'gz', 'tar', 'jar',
  'war', 'class', 'exe', 'dll', 'so', 'dylib', 'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'mp4', 'mov', 'avi', 'wav', 'bin', 'pyc',
]);

const MAX_VIEWABLE_BYTES = 1024 * 1024;

function buildTree(entries) {
  const root = { name: '', path: '', type: 'dir', children: [] };
  const dirs = new Map([['', root]]);

  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  for (const entry of sorted) {
    const parts = entry.path.split('/');
    const name = parts.pop();
    const parentPath = parts.join('/');
    const parent = dirs.get(parentPath) ?? root;
    const node = { name, path: entry.path, type: entry.type, size: entry.size, children: [] };
    parent.children.push(node);
    if (entry.type === 'dir') dirs.set(entry.path, node);
  }

  const order = (node) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    node.children.forEach(order);
  };
  order(root);
  return root;
}

function ancestorsOf(path) {
  const parts = path.split('/');
  parts.pop();
  return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}

export default function useRepoChat() {
  const { repoId } = useParams();

  const [entries, setEntries] = useState([]);
  const [treeError, setTreeError] = useState(null);
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());

  const [openFile, setOpenFile] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);

  const requestRef = useRef(0);

  useEffect(() => {
    setIsTreeLoading(true);
    getRepoTree(repoId)
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setTreeError('Could not load the file tree.'))
      .finally(() => setIsTreeLoading(false));
  }, [repoId]);

  const tree = useMemo(() => buildTree(entries), [entries]);

  const files = useMemo(
    () => entries.filter((e) => e.type === 'file'),
    [entries]
  );

  const resolvePath = useCallback((rawPath) => {
    if (!rawPath) return null;
    const cleaned = rawPath.replace(/\\/g, '/').replace(/^\.?\//, '').trim();
    const exact = files.find((f) => f.path === cleaned);
    if (exact) return exact.path;
    const suffix = files.find((f) => f.path.endsWith('/' + cleaned));
    return suffix ? suffix.path : null;
  }, [files]);

  const toggleDir = useCallback((path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const selectFile = useCallback((path, range = null) => {
    const entry = files.find((f) => f.path === path);
    if (!entry) return;

    setExpanded((prev) => {
      const next = new Set(prev);
      ancestorsOf(path).forEach((p) => next.add(p));
      return next;
    });
    setHighlight(range);

    if (openFile?.path === path) return;

    const extension = path.includes('.') ? path.split('.').pop().toLowerCase() : '';
    if (BINARY_EXTENSIONS.has(extension)) {
      setOpenFile({ path, content: null, notice: 'Binary file, preview not available.' });
      setFileError(null);
      return;
    }
    if (entry.size > MAX_VIEWABLE_BYTES) {
      setOpenFile({ path, content: null, notice: 'File is larger than 1 MB, open it on GitHub instead.' });
      setFileError(null);
      return;
    }

    const requestId = ++requestRef.current;
    setIsFileLoading(true);
    setFileError(null);
    getRepoFile(repoId, path)
      .then((data) => {
        if (requestId !== requestRef.current) return;
        const content = typeof data?.content === 'string' ? data.content : '';
        if (content.includes('\u0000')) {
          setOpenFile({ path, content: null, notice: 'Binary file, preview not available.' });
        } else {
          setOpenFile({ path, content });
        }
      })
      .catch(() => {
        if (requestId !== requestRef.current) return;
        setOpenFile({ path, content: null });
        setFileError('Could not load this file.');
      })
      .finally(() => {
        if (requestId === requestRef.current) setIsFileLoading(false);
      });
  }, [files, openFile?.path, repoId]);

  const openCitation = useCallback((rawPath, start, end) => {
    const path = resolvePath(rawPath);
    if (!path) return false;
    selectFile(path, start ? { start, end: end ?? start } : null);
    return true;
  }, [resolvePath, selectFile]);

  return {
    tree,
    fileCount: files.length,
    isTreeLoading,
    treeError,
    expanded,
    toggleDir,
    openFile,
    highlight,
    isFileLoading,
    fileError,
    selectFile,
    openCitation,
    resolvePath,
  };
}
