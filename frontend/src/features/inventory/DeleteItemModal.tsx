import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { ApiError } from "@/api";
import { useToast } from "@/components/Toast";
import { itemDisplayName } from "@/lib/format";
import { imageStore } from "@/lib/imageStore";
import type { Item } from "@/types";
import { useDeleteItem } from "./hooks";

interface DeleteItemModalProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: (item: Item) => void;
}

/**
 * Destructive confirmation for removing ONE unit. Names the exact serial so an
 * admin can't delete the wrong physical device by accident.
 */
export function DeleteItemModal({ item, open, onClose, onDeleted }: DeleteItemModalProps) {
  const deleteItem = useDeleteItem();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!item) return;
    setError(null);
    try {
      await deleteItem.mutateAsync(item.id);
      imageStore.remove(item.id);
      toast(`Unit ${item.serialNumber} deleted.`);
      onDeleted?.(item);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete. Please try again.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      title="Delete this unit?"
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
      {error && (
        <p role="alert" className="mb-md text-body-sm text-error">
          {error}
        </p>
      )}
      <p>
        This permanently removes the unit{" "}
        <code className="font-bold text-on-surface">{item?.serialNumber}</code>
        {item && <> ({itemDisplayName(item)})</>} from inventory. This action cannot be undone.
      </p>
    </Modal>
  );
}
