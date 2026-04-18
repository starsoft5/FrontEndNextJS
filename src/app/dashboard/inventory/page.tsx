"use client";

import { useState, useEffect, useCallback } from "react";
import { inventoryApi, InventoryItem, InventoryFormData } from "@/lib/api";
import { validateInventory, FieldErrors } from "@/lib/validation";

const emptyForm: InventoryFormData = {
  productName: "",
  productDescription: "",
  sku: "",
  stockQuantity: 0,
  unitPrice: 0,
  isAvailable: true,
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<InventoryFormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fetchItems = useCallback(async () => {
    try {
      const res = await inventoryApi.getAll();
      setItems(res.data);
    } catch {
      setError("Failed to load inventory.");
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();

    const errors = validateInventory(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      if (editingId) {
        await inventoryApi.update(editingId, form);
        setSuccess("Item updated successfully.");
      } else {
        await inventoryApi.create(form);
        setSuccess("Item created successfully.");
      }
      setForm(emptyForm);
      setEditingId(null);
      setFieldErrors({});
      await fetchItems();
    } catch {
      setError(editingId ? "Failed to update item." : "Failed to create item.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    clearMessages();
    setFieldErrors({});
    setEditingId(item.id);
    setForm({
      productName: item.productName,
      productDescription: item.productDescription || "",
      sku: item.sku || "",
      stockQuantity: item.stockQuantity,
      unitPrice: item.unitPrice,
      isAvailable: item.isAvailable,
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    clearMessages();
    try {
      await inventoryApi.delete(id);
      setSuccess("Item deleted successfully.");
      await fetchItems();
    } catch {
      setError("Failed to delete item.");
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFieldErrors({});
    clearMessages();
  };

  const update = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Inventory Management</h1>

      {/* Form */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-3">
        <h2 className="text-base font-semibold mb-1">
          {editingId ? "Edit Item" : "Add New Item"}
        </h2>

        {error && (
          <div className="mb-2 p-1.5 bg-red-50 border border-red-200 text-danger rounded-lg text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-2 p-1.5 bg-green-50 border border-green-200 text-success rounded-lg text-xs">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-1.5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="productName" className="block text-xs font-medium mb-0.5">
                Product Name
              </label>
              <input
                id="productName"
                type="text"
                value={form.productName}
                onChange={(e) => update("productName", e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.productName ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.productName && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.productName}</p>
              )}
            </div>
            <div>
              <label htmlFor="sku" className="block text-xs font-medium mb-0.5">
                SKU
              </label>
              <input
                id="sku"
                type="text"
                value={form.sku}
                onChange={(e) => update("sku", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. PROD-001"
              />
            </div>
          </div>

          <div>
            <label htmlFor="productDescription" className="block text-xs font-medium mb-0.5">
              Description
            </label>
            <textarea
              id="productDescription"
              rows={3}
              value={form.productDescription}
              onChange={(e) => update("productDescription", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label htmlFor="stockQuantity" className="block text-xs font-medium mb-0.5">
                Stock Quantity
              </label>
              <input
                id="stockQuantity"
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) => update("stockQuantity", parseInt(e.target.value) || 0)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.stockQuantity ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.stockQuantity && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.stockQuantity}</p>
              )}
            </div>
            <div>
              <label htmlFor="unitPrice" className="block text-xs font-medium mb-0.5">
                Unit Price
              </label>
              <input
                id="unitPrice"
                type="number"
                min={0}
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => update("unitPrice", parseFloat(e.target.value) || 0)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.unitPrice ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.unitPrice && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.unitPrice}</p>
              )}
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => update("isAvailable", e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium">Available</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : editingId
                ? "Update Item"
                : "Add Item"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1 border border-border rounded-lg font-medium hover:bg-border/50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Inventory List */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <h2 className="text-base font-semibold">Inventory List</h2>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">ID</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Product Name</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">SKU</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Stock</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Unit Price</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Available</th>
                <th className="text-right px-3 py-1.5 text-xs font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-muted">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-background/50">
                    <td className="px-3 py-1.5 text-xs">{item.id}</td>
                    <td className="px-3 py-1.5 text-xs font-medium">{item.productName}</td>
                    <td className="px-3 py-1.5 text-xs">{item.sku || "-"}</td>
                    <td className="px-3 py-1.5 text-xs">{item.stockQuantity}</td>
                    <td className="px-3 py-1.5 text-xs">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          item.isAvailable
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.isAvailable ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-primary hover:underline text-xs font-medium mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-danger hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {items.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted">No inventory items found.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="p-2.5 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.sku && <p className="text-xs text-muted">SKU: {item.sku}</p>}
                    <p className="text-xs">
                      Stock: {item.stockQuantity} | ${item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted">#{item.id}</span>
                    <div className="mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          item.isAvailable
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-primary text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-danger text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
