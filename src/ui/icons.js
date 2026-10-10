import { createElement, SlidersHorizontal, X, Eye, EyeOff, Pause, Play, RotateCcw, Trash2, Download, Upload, ExternalLink, ShieldCheck, ChevronDown, ChevronUp, Check, Sun, Moon } from 'lucide';

const icons = { settings: SlidersHorizontal, close: X, eye: Eye, eyeOff: EyeOff, pause: Pause, play: Play, retry: RotateCcw, trash: Trash2, download: Download, upload: Upload, external: ExternalLink, shield: ShieldCheck, down: ChevronDown, up: ChevronUp, check: Check, sun: Sun, moon: Moon };
export function icon(name, size = 16) {
  const node = createElement(icons[name]);
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  node.setAttribute('stroke-width', '1.6');
  node.setAttribute('aria-hidden', 'true');
  return node;
}
export function iconButton(name, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.append(icon(name));
  return button;
}
