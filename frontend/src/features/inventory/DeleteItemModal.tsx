import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { ApiError } from "@/api";
import { itemDisplayName } from "@/lib/format";
import type { Item } from "@/types";
import { useDeleteItem } from "./hooks";

interface DeleteItemModalProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  /** Called after a successful delete (e.g. to close an open detail panel). */
  onDeleted?: (item: Item) => void;
}

/**
 * Destructive confirmation. role="alertdialog" (via Modal), names the specific
 * item, and blocks while the request is in flight. Surfaces server errors
 * inline rather than closing optimistically.
 */
export function DeleteItemModal({ item, open, onClose, onDeleted }: DeleteItemModalProps) {
  const deleteItem = useDeleteItem();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!item) return;
    setError(null);
    try {
      await deleteItem.mutateAsync(item.id);
      // The backend removes the Cloudinary image as part of the delete.
      onDeleted?.(item);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete. Please try again.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      title="Delete this item?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={deleteItem.isPending}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleteItem.isPending} onClick={handleDelete}>
            Delete
          </Button>
        </>
      }
    >
      <p className="leading-relaxed">
        This will permanently remove{" "}
        <span className="font-bold text-on-surface">{item ? itemDisplayName(item) : ""}</span> from
        inventory. This action
        cannot be undone.
      </p>
      {error && (
        <p className="mt-sm text-body-sm text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
