import { hasArrayItemEditable } from "../helpers/checks.js";
import type { WindowType } from "../types/window.js";
import type ArrayItem from "./array-item.js";
import Editable from "./editable.js";

declare const window: WindowType;

export default class ArrayEditable extends Editable {
	value: unknown[] | undefined = undefined;

	validateValue(value: unknown): unknown[] | undefined {
		if (!Array.isArray(value)) {
			return undefined;
		}
		return value;
	}

	update(): void {
		const value = this.value;
		if (!value) {
			throw new Error("array-editable updated with invalid value");
		}

		const children: (HTMLElement & { editable: ArrayItem })[] = [];
		for (const child of this.element.querySelectorAll(
			"array-item,[data-editable='array-item']",
		)) {
			if (!hasArrayItemEditable(child)) {
				continue;
			}

			let parent = child.editable.parent?.element ?? child.parentElement;
			while (parent && !("editable" in parent)) {
				parent = parent.parentElement;
			}
			if (!parent || parent.editable !== this) {
				continue;
			}

			children.push(child as any);
		}

		if (!this.element.dataset.idKey) {
			if (children.length > value.length) {
				for (let i = value.length; i < children.length; i++) {
					children[i].remove();
				}
			}

			for (let i = 0; i < value.length; i++) {
				let child = children[i];
				if (!child) {
					child = children[0].cloneNode(true) as HTMLElement & {
						editable: ArrayItem;
					};
					this.element.appendChild(child);
					children.push(child);
				}
			}

			window.hydrateDataEditables?.(this.element);

			children.forEach((child, i) => {
				child.dataset.prop = `${i}`;
				child.editable.pushValue(value[i]);
			});
			return;
		}

		const dataKeys = this.value?.map((item) => {
			const key = this.element.dataset.idKey;
			return key ? (item as any)[key] : item;
		});

		const childKeys = children.map((element) => {
			return element.dataset.id;
		});

		const equal = dataKeys?.every((key, i) => key === childKeys[i]);
		if (equal && children.length === dataKeys?.length) {
			children.forEach((child, index) => {
				child.dataset.prop = `${index}`;
				child.editable.pushValue(value[index]);
			});
			return;
		}

		const placeholders = children.map((child) => {
			const placeholder = document.createElement("array-placeholder");
			child.after(placeholder);
			return placeholder;
		});

		const moved: Record<number, boolean> = {};

		dataKeys?.forEach((key, i) => {
			const placeholder = placeholders[i];
			const existingElement = children[i];
			const matchingChildIndex = children.findIndex(
				(child, i) => child.dataset.id === key && !moved[i],
			);

			let matchingChild = children[matchingChildIndex];
			if (!matchingChild) {
				const clone = children.find((child) => child.dataset.id === key);
				if (clone) {
					matchingChild = clone.cloneNode(true) as any;
				} else {
					matchingChild = document.createElement("array-item");
					matchingChild.dataset.id = key;

					const componentKey = this.element.dataset.componentKey;
					if (
						componentKey &&
						typeof this.value?.[i] === "object" &&
						this.value[i] &&
						(this.value[i] as any)[componentKey]
					) {
						matchingChild.dataset.component = (this.value[i] as any)[
							componentKey
						];
					}
				}
			} else {
				moved[matchingChildIndex] = true;
			}

			matchingChild.dataset.id = String(key);
			matchingChild.dataset.prop = `${i}`;

			if (existingElement === matchingChild) {
				placeholder.remove();
			} else if (placeholder) {
				placeholder.replaceWith(matchingChild);
			} else {
				this.element.appendChild(matchingChild);
			}

			matchingChild.editable.parent = this;
			matchingChild.editable.pushValue(value[i]);
		});

		children.forEach((child, i) => {
			if (!moved[i]) {
				child.remove();
			}
		});
		window.hydrateDataEditables?.(this.element);
	}
}
