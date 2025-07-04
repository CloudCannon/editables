import type { WindowType } from "../types/window.js";
import Editable from "./editable.js";

declare const window: WindowType;

export default class TextEditable extends Editable {
	editor?: any;
	elementType?: string;
	focused = false;

	update(): void {
		if (this.focused || typeof this.value !== "string") {
			return;
		}
		if (this.editor) {
			this.editor.setSlug(this.resolveSource());
			this.editor.setContent(this.value);
		}
	}

	mount(): void {
		this.element.onblur = () => {
			this.focused = false;
			this.parent?.update();
		};

		const editableOptions = {
			slug: this.resolveSource(),
			elementType: this.element.dataset.type,
		};

		if (typeof this.element.dataset.deferMount === "string") {
			this.element.onclick = () => {
				this.focused = true;
				if (!this.editor) {
					window.CloudCannon?.createTextEditableRegion(
						this.element,
						editableOptions,
					).then((editor) => {
						this.editor = editor;
						this.element.focus();
					});
				}
			};
			return;
		}

		this.element.onclick = () => {
			this.focused = true;
		};

		if (!window.CloudCannon && !this.editor) {
			document.addEventListener("cloudcannon:load", async (e) => {
				this.editor = await (
					e as any
				).detail.CloudCannon.createTextEditableRegion(
					this.element,
					editableOptions,
				);
			});
		} else if (!this.editor) {
			window.CloudCannon?.createTextEditableRegion(
				this.element,
				editableOptions,
			).then((editor) => {
				this.editor = editor;
			});
		}
	}
}
