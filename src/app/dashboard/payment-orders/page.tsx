"use client";

import { useState, useEffect, useCallback } from "react";
import {
  paymentOrderApi,
  customerApi,
  orderApi,
  PaymentOrder,
  Customer,
  Order,
  CreatePaymentOrderData,
  CreatePaymentOrderItemData,
  CustomerFormData,
} from "@/lib/api";
import { validatePaymentOrder, validateCustomer, FieldErrors } from "@/lib/validation";

interface PaymentItemFormData {
  orderItemId: number;
  amountPaid: number;
  quantity: number;
}

interface PaymentOrderFormData {
  customerId: number;
  paymentDate: string;
  notes?: string;
  paymentOrderItems: PaymentItemFormData[];
  status: string;
}

const emptyForm: PaymentOrderFormData = {
  customerId: 0,
  paymentDate: new Date().toISOString().split("T")[0],
  notes: "",
  paymentOrderItems: [{ orderItemId: 0, amountPaid: 0, quantity: 1 }],
  status: "Pending",
};

export default function PaymentOrdersPage() {
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<PaymentOrderFormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPaymentOrder, setEditingPaymentOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [historyOrderItemId, setHistoryOrderItemId] = useState<number | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState<CustomerFormData>({
    firstName: "", lastName: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "", country: "",
  });
  const [newCustomerErrors, setNewCustomerErrors] = useState<FieldErrors>({});
  const [newCustomerLoading, setNewCustomerLoading] = useState(false);

  const fetchPaymentOrders = useCallback(async () => {
    try {
      const res = await paymentOrderApi.getAll();
      setPaymentOrders(res.data);
    } catch {
      setError("Failed to load payment orders.");
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customerApi.getAll();
      setCustomers(res.data);
    } catch {}
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await orderApi.getAll();
      setOrders(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPaymentOrders();
    fetchCustomers();
    fetchOrders();
  }, [fetchPaymentOrders, fetchCustomers, fetchOrders]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const allOrderItems = orders.flatMap((order) =>
    (order.orderItems || []).map((item) => ({
      ...item,
      orderId: order.id,
      orderNumber: order.orderNumber,
    }))
  );

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();

    const errors = validatePaymentOrder(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      if (editingId && editingPaymentOrder) {
        await paymentOrderApi.update(editingId, {
          customerId: form.customerId,
          paymentDate: form.paymentDate,
          status: form.status,
          notes: form.notes,
        });

        const existingItems = editingPaymentOrder.paymentOrderItems || [];
        for (const item of existingItems) {
          await paymentOrderApi.removeItem(editingId, item.id);
        }
        for (const item of form.paymentOrderItems) {
          await paymentOrderApi.addItem(editingId, {
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            amountPaid: item.amountPaid,
          });
        }

        setSuccess("Payment order updated successfully.");
      } else {
        const createData: CreatePaymentOrderData = {
          customerId: form.customerId,
          paymentDate: form.paymentDate,
          notes: form.notes,
          paymentOrderItems: form.paymentOrderItems.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            amountPaid: item.amountPaid,
          })),
        };
        await paymentOrderApi.create(createData);
        setSuccess("Payment order created successfully.");
      }
      setForm(emptyForm);
      setEditingId(null);
      setEditingPaymentOrder(null);
      setFieldErrors({});
      await fetchPaymentOrders();
    } catch {
      setError(editingId ? "Failed to update payment order." : "Failed to create payment order.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (po: PaymentOrder) => {
    clearMessages();
    setFieldErrors({});
    setEditingId(po.id);
    setEditingPaymentOrder(po);
    setForm({
      customerId: po.customerId,
      paymentDate: po.paymentDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      notes: po.notes || "",
      status: po.status,
      paymentOrderItems:
        po.paymentOrderItems && po.paymentOrderItems.length > 0
          ? po.paymentOrderItems.map((i) => ({ orderItemId: i.orderItemId, amountPaid: i.amountPaid, quantity: i.quantity }))
          : [{ orderItemId: 0, amountPaid: 0, quantity: 1 }],
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payment order?")) return;
    clearMessages();
    try {
      await paymentOrderApi.delete(id);
      setSuccess("Payment order deleted successfully.");
      await fetchPaymentOrders();
    } catch {
      setError("Failed to delete payment order.");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingPaymentOrder(null);
    setForm(emptyForm);
    setFieldErrors({});
    clearMessages();
  };

  const checkAllPaid = (items: CreatePaymentOrderItemData[]) => {
    return items.length > 0 && items.every((item) => {
      if (!item.orderItemId || item.orderItemId <= 0) return false;
      const oi = allOrderItems.find((o) => o.id === item.orderItemId);
      if (!oi) return false;
      return Math.round(item.amountPaid * 100) === Math.round(oi.totalPrice * 100);
    });
  };

  const computeStatus = (items: PaymentItemFormData[]) =>
    checkAllPaid(items) ? "Completed" : "Pending";

  const addPaymentItem = () => {
    const newItems = [...form.paymentOrderItems, { orderItemId: 0, amountPaid: 0, quantity: 1 }];
    setForm({ ...form, paymentOrderItems: newItems, status: computeStatus(newItems) });
  };

  const removePaymentItem = (index: number) => {
    const newItems = form.paymentOrderItems.filter((_, i) => i !== index);
    setForm({ ...form, paymentOrderItems: newItems, status: computeStatus(newItems) });
  };

  const updatePaymentItem = (index: number, field: keyof PaymentItemFormData, value: number) => {
    const newItems = form.paymentOrderItems.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === "orderItemId") {
        const oi = allOrderItems.find((o) => o.id === value);
        updated.quantity = 1;
        updated.amountPaid = oi ? oi.totalPrice : 0;
      }
      return updated;
    });
    setForm({ ...form, paymentOrderItems: newItems, status: computeStatus(newItems) });
    setFieldErrors((prev) => ({ ...prev, [`paymentOrderItems_${index}_${field}`]: "" }));
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const grandTotal = form.paymentOrderItems.reduce((sum, item) => sum + item.amountPaid * item.quantity, 0);

  const allItemsFullyPaid = checkAllPaid(form.paymentOrderItems);

  const handleNewCustomerSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateCustomer(newCustomerForm);
    setNewCustomerErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setNewCustomerLoading(true);
    try {
      const res = await customerApi.create(newCustomerForm);
      await fetchCustomers();
      setForm((prev) => ({ ...prev, customerId: res.data.id }));
      setShowNewCustomer(false);
      setNewCustomerForm({ firstName: "", lastName: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "", country: "" });
      setNewCustomerErrors({});
      setSuccess("Customer created successfully.");
    } catch {
      setError("Failed to create customer.");
    } finally {
      setNewCustomerLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Payment Order Management</h1>

      {error && (
        <div className="p-1.5 bg-red-50 border border-red-200 text-danger rounded-lg text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="p-1.5 bg-green-50 border border-green-200 text-success rounded-lg text-xs">
          {success}
        </div>
      )}

      {/* Payment Order Form */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-3">
        <h2 className="text-base font-semibold mb-1">
          {editingId
            ? `Edit Payment Order #${paymentOrders.find((po) => po.id === editingId)?.paymentOrderNumber}`
            : "Create New Payment Order"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-1.5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="customerId" className="block text-xs font-medium mb-0.5">
                Customer *
              </label>
              <div className="flex gap-1">
                <select
                  id="customerId"
                  value={form.customerId}
                  onChange={(e) => updateField("customerId", parseInt(e.target.value) || 0)}
                  className={`flex-1 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white ${fieldErrors.customerId ? "border-red-500" : "border-border"}`}
                >
                  <option value={0}>Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} (ID: {c.id})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="px-2 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors whitespace-nowrap"
                >
                  New
                </button>
              </div>
              {fieldErrors.customerId && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.customerId}</p>
              )}
            </div>
            <div>
              <label htmlFor="paymentDate" className="block text-xs font-medium mb-0.5">
                Payment Date *
              </label>
              <input
                id="paymentDate"
                type="date"
                value={form.paymentDate}
                onChange={(e) => updateField("paymentDate", e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.paymentDate ? "border-red-500" : "border-border"}`}
                required
              />
              {fieldErrors.paymentDate && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.paymentDate}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-medium mb-0.5">
              Notes
            </label>
            <input
              id="notes"
              type="text"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Optional payment notes"
            />
          </div>

          {editingId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label htmlFor="status" className="block text-xs font-medium mb-0.5">
                  Status
                </label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed" disabled={!allItemsFullyPaid}>Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                {!allItemsFullyPaid && (
                  <p className="mt-0.5 text-xs text-muted">All items must be fully paid to set Completed.</p>
                )}
              </div>
            </div>
          )}

          {/* Payment Order Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Payment Items</label>
              <button
                type="button"
                onClick={addPaymentItem}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Add Item
              </button>
            </div>
            {fieldErrors.paymentOrderItems && (
              <p className="mb-2 text-sm text-danger">{fieldErrors.paymentOrderItems}</p>
            )}
            <div className="space-y-2">
              {form.paymentOrderItems.map((item, index) => {
                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row gap-2 p-2 border border-border rounded-lg bg-background"
                  >
                    <div className="flex-1">
                      <label className="block text-xs text-muted mb-1">Order Item</label>
                      <select
                        value={item.orderItemId}
                        onChange={(e) =>
                          updatePaymentItem(index, "orderItemId", parseInt(e.target.value) || 0)
                        }
                        className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white ${fieldErrors[`paymentOrderItems_${index}_orderItemId`] ? "border-red-500" : "border-border"}`}
                      >
                        <option value={0}>Select order item...</option>
                        {allOrderItems.map((oi) => (
                          <option key={oi.id} value={oi.id}>
                            ID:{oi.id} | {oi.orderNumber} | {oi.productName} x{oi.quantity} - ${oi.totalPrice.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors[`paymentOrderItems_${index}_orderItemId`] && (
                        <p className="mt-1 text-xs text-danger">
                          {fieldErrors[`paymentOrderItems_${index}_orderItemId`]}
                        </p>
                      )}
                    </div>
                    <div className="w-full sm:w-20">
                      <label className="block text-xs text-muted mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity || ""}
                        onChange={(e) =>
                          updatePaymentItem(index, "quantity", parseInt(e.target.value) || 1)
                        }
                        className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors[`paymentOrderItems_${index}_quantity`] ? "border-red-500" : "border-border"}`}
                        placeholder="1"
                      />
                      {fieldErrors[`paymentOrderItems_${index}_quantity`] && (
                        <p className="mt-1 text-xs text-danger">
                          {fieldErrors[`paymentOrderItems_${index}_quantity`]}
                        </p>
                      )}
                    </div>
                    <div className="w-full sm:w-36">
                      <label className="block text-xs text-muted mb-1">Amount Paid</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.amountPaid || ""}
                        onChange={(e) =>
                          updatePaymentItem(index, "amountPaid", parseFloat(e.target.value) || 0)
                        }
                        className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors[`paymentOrderItems_${index}_amountPaid`] ? "border-red-500" : "border-border"}`}
                        placeholder="0.00"
                      />
                      {fieldErrors[`paymentOrderItems_${index}_amountPaid`] && (
                        <p className="mt-1 text-xs text-danger">
                          {fieldErrors[`paymentOrderItems_${index}_amountPaid`]}
                        </p>
                      )}
                    </div>
                    <div className="w-full sm:w-32">
                      <label className="block text-xs text-muted mb-1">Line Total</label>
                      <input
                        type="text"
                        readOnly
                        value={`$${(item.amountPaid * item.quantity).toFixed(2)}`}
                        className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-gray-50 text-muted"
                      />
                    </div>
                    <div className="flex items-end gap-1">
                      {form.paymentOrderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePaymentItem(index)}
                          className="p-1 text-danger hover:bg-red-50 rounded-lg"
                          title="Remove"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-2 border border-border rounded-lg bg-background">
            <span className="text-sm font-semibold">Grand Total:</span>
            <span className="text-sm font-bold text-primary">${grandTotal.toFixed(2)}</span>
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
                ? "Update Payment Order"
                : "Create Payment Order"}
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

      {/* Payment Orders List */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <h2 className="text-base font-semibold">Payment Orders List</h2>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Payment #</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Customer</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Payment Date</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Items</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Total</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Status</th>
                <th className="text-right px-3 py-1.5 text-xs font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paymentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-muted">
                    No payment orders found.
                  </td>
                </tr>
              ) : (
                paymentOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-background/50">
                    <td className="px-3 py-1.5 text-xs font-medium">{po.paymentOrderNumber}</td>
                    <td className="px-3 py-1.5 text-xs">{po.customerName}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {new Date(po.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {po.paymentOrderItems && po.paymentOrderItems.length > 0 ? (
                        <span
                          title={po.paymentOrderItems
                            .map((i) => `${i.orderNumber} - ${i.productName} ($${i.amountPaid.toFixed(2)})`)
                            .join(", ")}
                        >
                          {po.paymentOrderItems.length} item{po.paymentOrderItems.length !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-xs">${po.totalAmount.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor(po.status)}`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => handleEdit(po)}
                        className="text-primary hover:underline text-xs font-medium mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(po.id)}
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
          {paymentOrders.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted">No payment orders found.</div>
          ) : (
            paymentOrders.map((po) => (
              <div key={po.id} className="p-2.5 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{po.paymentOrderNumber}</p>
                    <p className="text-xs text-muted">{po.customerName}</p>
                    <p className="text-xs text-muted">
                      {new Date(po.paymentDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs font-medium">${po.totalAmount.toFixed(2)}</p>
                    {po.paymentOrderItems && po.paymentOrderItems.length > 0 && (
                      <p className="text-xs text-muted mt-1">
                        {po.paymentOrderItems
                          .map((i) => `${i.orderNumber} - ${i.productName} ($${i.amountPaid.toFixed(2)})`)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor(po.status)}`}
                      >
                        {po.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(po)}
                    className="text-primary text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(po.id)}
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

      {/* New Customer Modal */}
      {showNewCustomer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowNewCustomer(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card-bg rounded-xl shadow-lg border border-border w-full max-w-md max-h-[80vh] overflow-auto">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="text-base font-semibold">New Customer</h3>
                <button onClick={() => setShowNewCustomer(false)} className="p-1 hover:bg-border/50 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleNewCustomerSubmit} className="p-4 space-y-2" noValidate>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-0.5">First Name *</label>
                    <input type="text" value={newCustomerForm.firstName} onChange={(e) => { setNewCustomerForm((p) => ({ ...p, firstName: e.target.value })); setNewCustomerErrors((p) => ({ ...p, firstName: "" })); }}
                      className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${newCustomerErrors.firstName ? "border-red-500" : "border-border"}`} />
                    {newCustomerErrors.firstName && <p className="mt-0.5 text-xs text-danger">{newCustomerErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Last Name *</label>
                    <input type="text" value={newCustomerForm.lastName} onChange={(e) => { setNewCustomerForm((p) => ({ ...p, lastName: e.target.value })); setNewCustomerErrors((p) => ({ ...p, lastName: "" })); }}
                      className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${newCustomerErrors.lastName ? "border-red-500" : "border-border"}`} />
                    {newCustomerErrors.lastName && <p className="mt-0.5 text-xs text-danger">{newCustomerErrors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Email *</label>
                  <input type="email" value={newCustomerForm.email} onChange={(e) => { setNewCustomerForm((p) => ({ ...p, email: e.target.value })); setNewCustomerErrors((p) => ({ ...p, email: "" })); }}
                    className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${newCustomerErrors.email ? "border-red-500" : "border-border"}`} />
                  {newCustomerErrors.email && <p className="mt-0.5 text-xs text-danger">{newCustomerErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Phone</label>
                  <input type="text" value={newCustomerForm.phone} onChange={(e) => { setNewCustomerForm((p) => ({ ...p, phone: e.target.value })); setNewCustomerErrors((p) => ({ ...p, phone: "" })); }}
                    className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${newCustomerErrors.phone ? "border-red-500" : "border-border"}`} />
                  {newCustomerErrors.phone && <p className="mt-0.5 text-xs text-danger">{newCustomerErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">Address</label>
                  <input type="text" value={newCustomerForm.address} onChange={(e) => setNewCustomerForm((p) => ({ ...p, address: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-0.5">City</label>
                    <input type="text" value={newCustomerForm.city} onChange={(e) => setNewCustomerForm((p) => ({ ...p, city: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">State</label>
                    <input type="text" value={newCustomerForm.state} onChange={(e) => setNewCustomerForm((p) => ({ ...p, state: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Zip Code</label>
                    <input type="text" value={newCustomerForm.zipCode} onChange={(e) => setNewCustomerForm((p) => ({ ...p, zipCode: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5">Country</label>
                    <input type="text" value={newCustomerForm.country} onChange={(e) => setNewCustomerForm((p) => ({ ...p, country: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={newCustomerLoading}
                    className="px-3 py-1 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
                    {newCustomerLoading ? "Saving..." : "Create Customer"}
                  </button>
                  <button type="button" onClick={() => setShowNewCustomer(false)}
                    className="px-3 py-1 border border-border rounded-lg font-medium hover:bg-border/50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Payment History Modal */}
      {historyOrderItemId !== null && (() => {
        const orderItem = allOrderItems.find((oi) => oi.id === historyOrderItemId);
        const historyRecords = paymentOrders
          .filter((po) => po.customerId === form.customerId)
          .flatMap((po) =>
            (po.paymentOrderItems || [])
              .filter((pi) => pi.orderItemId === historyOrderItemId)
              .map((pi) => ({
                paymentOrderNumber: po.paymentOrderNumber,
                paymentDate: po.paymentDate,
                status: po.status,
                customerName: po.customerName,
                amountPaid: pi.amountPaid,
              }))
          )
          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        const customerName = historyRecords.length > 0 ? historyRecords[0].customerName : "-";
        const totalPaid = historyRecords.reduce((sum, r) => sum + r.amountPaid, 0);

        return (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setHistoryOrderItemId(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-card-bg rounded-xl shadow-lg border border-border w-full max-w-lg max-h-[80vh] overflow-auto">
                <div className="p-4 border-b border-border flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-semibold">Payment History</h3>
                    {orderItem && (
                      <div className="text-xs text-muted mt-1 space-y-0.5">
                        <p>Customer: <span className="text-foreground font-medium">{customerName}</span></p>
                        <p>Order: <span className="text-foreground font-medium">{orderItem.orderNumber}</span></p>
                        <p>Product: <span className="text-foreground font-medium">{orderItem.productName}</span></p>
                        <p>Order Item Total: <span className="text-foreground font-medium">${orderItem.totalPrice.toFixed(2)}</span></p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setHistoryOrderItemId(null)}
                    className="p-1 hover:bg-border/50 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-4">
                  {historyRecords.length === 0 ? (
                    <p className="text-sm text-muted text-center py-4">No payment history found for this item.</p>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1.5 text-xs font-medium text-muted">No.</th>
                            <th className="text-left py-1.5 text-xs font-medium text-muted">Payment Order #</th>
                            <th className="text-left py-1.5 text-xs font-medium text-muted">Date</th>
                            <th className="text-left py-1.5 text-xs font-medium text-muted">Status</th>
                            <th className="text-right py-1.5 text-xs font-medium text-muted">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {historyRecords.map((r, i) => (
                            <tr key={i}>
                              <td className="py-1.5 text-xs">{i + 1}</td>
                              <td className="py-1.5 text-xs">{r.paymentOrderNumber}</td>
                              <td className="py-1.5 text-xs">{new Date(r.paymentDate).toLocaleDateString()}</td>
                              <td className="py-1.5 text-xs">
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-1.5 text-xs text-right">${r.amountPaid.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 pt-2 border-t border-border flex justify-between text-sm font-medium">
                        <span>Total Paid</span>
                        <span>${totalPaid.toFixed(2)}</span>
                      </div>
                      {orderItem && (
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-muted">Remaining Balance</span>
                          <span className={orderItem.totalPrice - totalPaid > 0 ? "text-danger" : "text-success"}>
                            ${(orderItem.totalPrice - totalPaid).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
