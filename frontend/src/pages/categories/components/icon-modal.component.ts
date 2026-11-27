import { ChangeDetectionStrategy, Component, inject, input, output, signal, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Icon } from "../../../components/icon.component";
import { Modal, ModalActions } from "../../../components/modal.component";
import { SelectInput } from "../../../components/select-input.component";
import { Api } from "../../../lib/api.service";
import type { IconGroup, IconItem } from "../../../lib/types";

export type IconMode = "emoji" | "svg" | "image";

const MODES: { mode: IconMode; label: string }[] = [{ mode: "emoji", label: "Emoji" }, { mode: "svg", label: "SVG Path" }, { mode: "image", label: "Image Upload" }];
const GROUP_OPTIONS = (["Wallet", "Category", "General"] as IconGroup[]).map((g) => ({ value: g, label: g }));
const DEFAULT_GROUP: IconGroup = "General";
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MODE_ACTIVE = "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400";
const MODE_IDLE = "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500";
const FILE_INPUT = "block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 dark:file:border-gray-600 file:text-sm file:bg-white dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200 hover:file:border-gray-400 dark:hover:file:border-gray-500";
const SVG_PLACEHOLDER = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M..." />';

export const detectMode = (value: string): IconMode => (value.trimStart().startsWith("<") ? "svg" : value.startsWith("http") ? "image" : "emoji");

@Component({
  selector: "app-icon-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Icon, Modal, ModalActions, SelectInput],
  template: `
    <app-modal [title]="icon() ? 'Edit Icon' : 'Add Icon'" [error]="error()" panelClass="max-w-lg p-6" (close)="close.emit()">
      <div>
        <label class="form-label">Name *</label>
        <input [(ngModel)]="name" class="form-input" placeholder="Icon name" />
      </div>
      <div>
        <label class="form-label">Group</label>
        <app-select-input [(value)]="group" [options]="groupOptions" />
      </div>
      <div>
        <label class="form-label">Sort Order</label>
        <input [(ngModel)]="sortOrder" class="form-input" type="number" min="0" />
      </div>
      <div>
        <label class="form-label">Icon Value</label>
        <div class="flex gap-2 mb-2">
          @for (m of modes; track m.mode) {
            <button type="button" class="text-xs px-2 py-1 rounded border" [class]="mode() === m.mode ? modeActive : modeIdle" (click)="switchMode(m.mode)">{{ m.label }}</button>
          }
        </div>
        @switch (mode()) {
          @case ("emoji") { <input [(ngModel)]="value" class="form-input" placeholder="e.g. 💳" /> }
          @case ("svg") {
            <textarea [(ngModel)]="value" class="form-input font-mono text-xs" rows="4" [placeholder]="svgPlaceholder"></textarea>
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">Paste the <code>&lt;path&gt;</code> content from a 24×24 SVG (e.g. Heroicons).</div>
          }
          @case ("image") {
            @if (uploading()) {
              <div class="text-sm text-gray-500 dark:text-gray-400 py-2">Uploading…</div>
            } @else {
              <input #file type="file" [accept]="accept" (change)="upload(file.files?.[0])" [class]="fileInput" />
            }
            @if (value().startsWith("http")) { <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">{{ value() }}</div> }
          }
        }
        @if (value()) {
          <div class="mt-3 flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">Preview:</span>
            <div class="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200">
              <app-icon [value]="value()" size="w-6 h-6" emojiClass="text-2xl leading-none" />
            </div>
          </div>
        }
      </div>
      <app-modal-actions [saving]="saving()" (cancel)="close.emit()" (save)="save()" />
    </app-modal>
  `,
})
export class IconModal implements OnInit {
  readonly icon = input<IconItem | null>(null);
  readonly close = output();
  readonly saved = output();

  private readonly api = inject(Api);
  protected readonly modes = MODES;
  protected readonly groupOptions = GROUP_OPTIONS;
  protected readonly accept = ACCEPT;
  protected readonly modeActive = MODE_ACTIVE;
  protected readonly modeIdle = MODE_IDLE;
  protected readonly fileInput = FILE_INPUT;
  protected readonly svgPlaceholder = SVG_PLACEHOLDER;

  protected readonly name = signal("");
  protected readonly group = signal<string>(DEFAULT_GROUP);
  protected readonly sortOrder = signal<number | null>(0);
  protected readonly value = signal("");
  protected readonly mode = signal<IconMode>("emoji");
  protected readonly uploading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    const icon = this.icon();
    if (!icon) return;
    this.name.set(icon.name);
    this.group.set(icon.group);
    this.sortOrder.set(icon.sortOrder);
    this.value.set(icon.value);
    this.mode.set(detectMode(icon.value));
  }

  protected switchMode(mode: IconMode) {
    this.mode.set(mode);
    this.value.set("");
  }

  protected async upload(file?: File) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) return this.error.set("Image must be 5 MB or smaller.");
    this.error.set(null);
    this.uploading.set(true);
    const { data } = await this.api.uploadIcon(file);
    this.uploading.set(false);
    if (data) this.value.set(data.iconUrl);
  }

  protected async save() {
    const name = this.name().trim();
    const value = this.value().trim();
    if (!name) return this.error.set("Name is required.");
    if (!value) return this.error.set("Icon value is required.");
    this.error.set(null);
    this.saving.set(true);
    const body = { value, name, group: this.group() as IconGroup, sortOrder: Number(this.sortOrder()) || 0 };
    const icon = this.icon();
    const { error } = icon ? await this.api.updateIcon(icon.id, body) : await this.api.createIcon(body);
    this.saving.set(false);
    if (!error) this.saved.emit();
  }
}
