import { Modal, App } from 'obsidian';
import type { BetterMermaidSettings } from './settings';
import { i18n } from './settings';

const ZOOM_OPTIONS = [
  { label: '20%', value: 0.2 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
];

export class MermaidImageModal extends Modal {
  private svg: SVGSVGElement;
  private settings: BetterMermaidSettings;
  private scale = 1;
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private viewport: HTMLElement;
  private svgEl: SVGSVGElement;
  private zoomSelect: HTMLSelectElement;

  constructor(app: App, svg: SVGSVGElement, settings: BetterMermaidSettings) {
    super(app);
    this.svg = svg;
    this.settings = settings;
    this.scale = settings.defaultZoomLevel / 100;
    this.modalEl.addClass('better-mermaid-modal-size');
  }

  private t(key: string): string {
    return i18n(this.settings.language, key);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('better-mermaid-modal');

    this.svgEl = this.svg.cloneNode(true) as SVGSVGElement;
    this.svgEl.removeAttribute('width');
    this.svgEl.removeAttribute('height');
    this.svgEl.addClass('better-mermaid-svg');

    this.viewport = contentEl.createDiv({ cls: 'better-mermaid-viewport' });
    this.viewport.appendChild(this.svgEl);

    const controls = this.viewport.createDiv({ cls: 'better-mermaid-controls' });

    controls.createEl('label', { text: this.t('zoom') });

    this.zoomSelect = controls.createEl('select');
    ZOOM_OPTIONS.forEach((opt) => {
      const option = this.zoomSelect.createEl('option');
      option.value = String(opt.value);
      option.text = opt.label;
    });
    this.zoomSelect.value = String(this.scale);
    this.zoomSelect.addEventListener('change', () => {
      const gen = this.zoomSelect.querySelector('[data-generated]');
      if (gen) gen.remove();
      this.setZoom(parseFloat(this.zoomSelect.value));
    });

    this.applyTransform();
    this.syncZoomDisplay(this.scale);

    const btn = controls.createEl('button', { text: this.t('downloadPng') });
    btn.addEventListener('click', () => {
      void this.handleDownload(btn);
    });

    const doc = this.viewport.ownerDocument;

    this.viewport.addEventListener('wheel', this.onWheel, { passive: false });
    this.viewport.addEventListener('mousedown', this.onMouseDown);
    doc.addEventListener('mousemove', this.onMouseMove);
    doc.addEventListener('mouseup', this.onMouseUp);
  }

  onClose() {
    const doc = this.viewport.ownerDocument;

    doc.removeEventListener('mousemove', this.onMouseMove);
    doc.removeEventListener('mouseup', this.onMouseUp);
    this.contentEl.empty();
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
  }

  private setZoom(scale: number) {
    const rect = this.viewport.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    this.panX = cx - (cx - this.panX) * (scale / this.scale);
    this.panY = cy - (cy - this.panY) * (scale / this.scale);
    this.scale = scale;

    this.applyTransform();
    this.syncZoomDisplay(scale);
  }

  private syncZoomDisplay(scale: number) {
    const gen = this.zoomSelect.querySelector('[data-generated]');
    if (gen) gen.remove();

    const exact = ZOOM_OPTIONS.find((o) => Math.abs(o.value - scale) < 0.005);
    if (exact) {
      this.zoomSelect.value = String(exact.value);
      return;
    }

    const doc = this.contentEl.ownerDocument;
    const opt = doc.createElement('option');
    opt.setAttribute('data-generated', 'true');
    opt.value = String(scale);
    opt.text = `${Math.round(scale * 100)}%`;
    this.zoomSelect.appendChild(opt);
    this.zoomSelect.value = String(scale);
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey) {
      const rect = this.viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = 1 - e.deltaY * 0.005;
      const newScale = Math.max(0.1, Math.min(10, this.scale * factor));
      this.panX = mx - (mx - this.panX) * (newScale / this.scale);
      this.panY = my - (my - this.panY) * (newScale / this.scale);
      this.scale = newScale;
      this.syncZoomDisplay(newScale);
    } else if (e.shiftKey) {
      this.panX -= e.deltaY;
    } else {
      this.panY -= e.deltaY;
    }
    this.applyTransform();
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.better-mermaid-controls')) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.panStartX = this.panX;
    this.panStartY = this.panY;
    this.viewport.addClass('better-mermaid-grabbing');
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.panX = this.panStartX + (e.clientX - this.dragStartX);
    this.panY = this.panStartY + (e.clientY - this.dragStartY);
    this.applyTransform();
  };

  private onMouseUp = () => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.viewport.removeClass('better-mermaid-grabbing');
  };

  private applyTransform() {
    this.svgEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  private async handleDownload(btn: HTMLButtonElement) {
    btn.setText(this.t('converting'));
    btn.disabled = true;
    try {
      const pngDataUrl = await this.svgToPng();
      const doc = this.contentEl.ownerDocument;
      const link = doc.createElement('a');
      link.download = 'mermaid-diagram.png';
      link.href = pngDataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to convert SVG to PNG:', e);
    }
    btn.setText(this.t('downloadPng'));
    btn.disabled = false;
  }

  private svgToPng(): Promise<string> {
    const cloned = this.svg.cloneNode(true) as SVGSVGElement;
    const viewBox = cloned.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      if (parts.length === 4) {
        cloned.setAttribute('width', String(parts[2]));
        cloned.setAttribute('height', String(parts[3]));
      }
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(cloned);
    const dataUrl =
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const doc = this.contentEl.ownerDocument;
        const canvas = doc.createElement('canvas');
        const pxRatio = 2;
        canvas.width = img.width * pxRatio;
        canvas.height = img.height * pxRatio;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.scale(pxRatio, pxRatio);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        reject(new Error('Failed to load SVG image'));
      };
      img.src = dataUrl;
    });
  }
}
