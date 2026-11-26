import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from "@angular/core";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { Glyph } from "../../components/glyph";
import { Icon } from "../../components/icon";
import { Spinner } from "../../components/spinner";
import { Api } from "../../lib/api";
import type { IconGroup, IconItem } from "../../lib/types";
import { IconModal } from "./icon-modal";
import { ADD_PATH, DELETE_PATH, EDIT_PATH, LOCK_PATH } from "./paths";

const SECTIONS: { title: string; empty: string; badge: string; groups: IconGroup[] }[] = [
  { title: "Wallet Icons", empty: "No wallet icons yet.", badge: "badge-blue", groups: ["Wallet", "General"] },
  { title: "Category Icons", empty: "No category icons yet.", badge: "badge-green", groups: ["Category", "General"] },
];

@Component({
  selector: "app-icon-library",
  imports: [ConfirmDialog, Glyph, Icon, Spinner, IconModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "contents" },
  templateUrl: "./icon-library.html",
})
export class IconLibrary {
  private readonly api = inject(Api);
  protected readonly sections = SECTIONS;
  protected readonly paths = { add: ADD_PATH, edit: EDIT_PATH, delete: DELETE_PATH, lock: LOCK_PATH };
  protected readonly form = signal<{ icon: IconItem | null } | null>(null);
  protected readonly deleting = signal<IconItem | null>(null);
  protected readonly deleteMessage = computed(() => `Delete '${this.deleting()?.name}'?`);

  private readonly iconsResource = resource({ loader: () => this.api.getIcons() });
  protected readonly loading = computed(() => !this.iconsResource.hasValue());
  private readonly icons = computed(() => this.iconsResource.value()?.data ?? []);

  protected inGroups(groups: IconGroup[]) {
    return this.icons().filter((i) => groups.includes(i.group));
  }

  protected saved() {
    this.form.set(null);
    this.iconsResource.reload();
  }

  protected async confirmDelete() {
    const deleting = this.deleting();
    if (!deleting) return;
    const { error } = await this.api.deleteIcon(deleting.id);
    this.deleting.set(null);
    if (!error) this.iconsResource.reload();
  }
}
