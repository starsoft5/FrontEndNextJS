"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  orderApi,
  customerApi,
  inventoryApi,
  Order,
  Customer,
  InventoryItem,
  CreateOrderData,
  CreateOrderItemData,
  CustomerFormData,
} from "@/lib/api";
import { validateOrder, validateCustomer, FieldErrors } from "@/lib/validation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface OrderFormData extends CreateOrderData {
  status: string;
}

const emptyForm: OrderFormData = {
  customerId: 0,
  orderDate: new Date().toISOString().split("T")[0],
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingZipCode: "",
  shippingCountry: "",
  notes: "",
  orderItems: [{ inventoryId: 0, quantity: 1 }],
  status: "Pending",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<OrderFormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [customerFormErrors, setCustomerFormErrors] = useState<FieldErrors>({});
  const [customerFormLoading, setCustomerFormLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [showPrintFilter, setShowPrintFilter] = useState(false);
  const [printFromDate, setPrintFromDate] = useState("");
  const [printToDate, setPrintToDate] = useState("");
  const [filteredOrdersForPrint, setFilteredOrdersForPrint] = useState<Order[]>([]);
  const printTemplateRef = useRef<HTMLDivElement>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await orderApi.getAll();
      setOrders(res.data);
    } catch {
      setError("Failed to load orders.");
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customerApi.getAll();
      setCustomers(res.data);
    } catch {
      // Customers endpoint may not exist yet
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await inventoryApi.getAll();
      setInventory(res.data);
    } catch {
      // Inventory endpoint may not exist yet
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchInventory();
  }, [fetchOrders, fetchCustomers, fetchInventory]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();

    const errors = validateOrder(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      if (editingId && editingOrder) {
        // Update order metadata
        await orderApi.update(editingId, {
          customerId: form.customerId,
          orderDate: form.orderDate,
          status: form.status,
          shippingAddress: form.shippingAddress,
          shippingCity: form.shippingCity,
          shippingState: form.shippingState,
          shippingZipCode: form.shippingZipCode,
          shippingCountry: form.shippingCountry,
          notes: form.notes,
        });

        // Sync order items: remove all existing, then add new ones
        const existingItems = editingOrder.orderItems || [];
        for (const item of existingItems) {
          await orderApi.removeItem(editingId, item.id);
        }
        for (const item of form.orderItems) {
          await orderApi.addItem(editingId, {
            inventoryId: item.inventoryId,
            quantity: item.quantity,
          });
        }

        setSuccess("Order updated successfully.");
      } else {
        const { status: _, ...createData } = form;
        await orderApi.create(createData);
        setSuccess("Order created successfully.");
      }
      setForm(emptyForm);
      setEditingId(null);
      setEditingOrder(null);
      setFieldErrors({});
      await fetchOrders();
    } catch {
      setError(editingId ? "Failed to update order." : "Failed to create order.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order: Order) => {
    clearMessages();
    setFieldErrors({});
    setEditingId(order.id);
    setEditingOrder(order);
    setForm({
      customerId: order.customerId,
      orderDate: order.orderDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      shippingAddress: order.shippingAddress || "",
      shippingCity: order.shippingCity || "",
      shippingState: order.shippingState || "",
      shippingZipCode: order.shippingZipCode || "",
      shippingCountry: order.shippingCountry || "",
      notes: order.notes || "",
      status: order.status,
      orderItems:
        order.orderItems && order.orderItems.length > 0
          ? order.orderItems.map((i) => ({ inventoryId: i.inventoryId, quantity: i.quantity }))
          : [{ inventoryId: 0, quantity: 1 }],
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    clearMessages();
    try {
      await orderApi.delete(id);
      setSuccess("Order deleted successfully.");
      await fetchOrders();
    } catch {
      setError("Failed to delete order.");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingOrder(null);
    setForm(emptyForm);
    setFieldErrors({});
    clearMessages();
  };

  const addOrderItem = () => {
    setForm((prev) => ({
      ...prev,
      orderItems: [...prev.orderItems, { inventoryId: 0, quantity: 1 }],
    }));
  };

  const removeOrderItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      orderItems: prev.orderItems.filter((_, i) => i !== index),
    }));
  };

  const updateOrderItem = (index: number, field: keyof CreateOrderItemData, value: number) => {
    setForm((prev) => ({
      ...prev,
      orderItems: prev.orderItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
    setFieldErrors((prev) => ({ ...prev, [`orderItems_${index}_${field}`]: "" }));
  };

  const handleCreateCustomer = async () => {
    const errors = validateCustomer(customerForm);
    setCustomerFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCustomerFormLoading(true);
    try {
      const res = await customerApi.create(customerForm);
      const newCustomer = res.data;
      await fetchCustomers();
      updateField("customerId", newCustomer.id);
      setCustomerForm({ firstName: "", lastName: "", email: "", phone: "" });
      setCustomerFormErrors({});
      setShowCustomerForm(false);
      setSuccess("Customer created successfully.");
    } catch {
      setError("Failed to create customer.");
    } finally {
      setCustomerFormLoading(false);
    }
  };

  const updateCustomerField = (field: keyof CustomerFormData, value: string) => {
    setCustomerForm((prev) => ({ ...prev, [field]: value }));
    setCustomerFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : `Customer #${customerId}`;
  };

  const handlePrint = () => {
    // Show date filter dialog
    setShowPrintFilter(true);
  };

  const handleGeneratePDF = async () => {
    // Validate dates
    if (!printFromDate || !printToDate) {
      setError("Please select both From Date and To Date.");
      return;
    }

    const fromDate = new Date(printFromDate);
    const toDate = new Date(printToDate);

    if (fromDate > toDate) {
      setError("From Date must be before To Date.");
      return;
    }

    setPrintLoading(true);
    try {
      // Fetch filtered orders from backend
      const res = await orderApi.getByDateRange(printFromDate, printToDate);
      setFilteredOrdersForPrint(res.data);

      if (!printTemplateRef.current) {
        setError("Print template not found.");
        return;
      }

      const element = printTemplateRef.current;

      // Make element visible temporarily
      const originalStyle = element.style.display;
      element.style.display = "block";
      element.style.position = "absolute";
      element.style.left = "-9999px";
      element.style.top = "-9999px";
      element.style.width = "210mm";

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        windowHeight: element.scrollHeight,
        windowWidth: element.scrollWidth,
      });

      // Restore original style
      element.style.display = originalStyle;
      element.style.position = "";
      element.style.left = "";
      element.style.top = "";
      element.style.width = "";

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      pdf.save(`Orders-${printFromDate}-${printToDate}.pdf`);
      setSuccess("PDF generated successfully.");
      setShowPrintFilter(false);
      setPrintFromDate("");
      setPrintToDate("");
      setFilteredOrdersForPrint([]);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Shipped":
        return "bg-blue-100 text-blue-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Order Management</h1>

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

      {/* Print Filter Dialog */}
      {showPrintFilter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card-bg rounded-xl shadow-lg border border-border p-4 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-3">Filter Report by Date Range</h2>

            <div className="space-y-3 mb-4">
              <div>
                <label htmlFor="printFromDate" className="block text-xs font-medium mb-1">
                  From Date *
                </label>
                <input
                  id="printFromDate"
                  type="date"
                  value={printFromDate}
                  onChange={(e) => {
                    setPrintFromDate(e.target.value);
                    clearMessages();
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="printToDate" className="block text-xs font-medium mb-1">
                  To Date *
                </label>
                <input
                  id="printToDate"
                  type="date"
                  value={printToDate}
                  onChange={(e) => {
                    setPrintToDate(e.target.value);
                    clearMessages();
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGeneratePDF}
                disabled={printLoading}
                className="flex-1 px-3 py-1.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {printLoading ? "Generating..." : "Generate PDF"}
              </button>
              <button
                onClick={() => {
                  setShowPrintFilter(false);
                  setPrintFromDate("");
                  setPrintToDate("");
                  clearMessages();
                }}
                className="flex-1 px-3 py-1.5 border border-border rounded-lg font-medium hover:bg-border/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Form */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-3">
        <h2 className="text-base font-semibold mb-1">
          {editingId
            ? `Edit Order #${orders.find((o) => o.id === editingId)?.orderNumber}`
            : "Create New Order"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-1.5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="customerId" className="block text-xs font-medium mb-0.5">
                Customer
              </label>
              <div className="flex gap-1.5">
                <select
                  id="customerId"
                  value={form.customerId}
                  onChange={(e) => updateField("customerId", parseInt(e.target.value) || 0)}
                  className={`flex-1 px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white ${fieldErrors.customerId ? "border-red-500" : "border-border"}`}
                >
                  <option value={0}>Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerForm((prev) => !prev);
                    setCustomerFormErrors({});
                  }}
                  className="px-2 py-1 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors whitespace-nowrap"
                >
                  {showCustomerForm ? "Cancel" : "+ New"}
                </button>
              </div>
              {fieldErrors.customerId && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.customerId}</p>
              )}

              {showCustomerForm && (
                <div className="mt-2 p-2.5 border border-primary/30 rounded-lg bg-primary/5 space-y-2">
                  <h3 className="text-xs font-semibold text-primary">New Customer</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-0.5">First Name *</label>
                      <input
                        type="text"
                        value={customerForm.firstName}
                        onChange={(e) => updateCustomerField("firstName", e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${customerFormErrors.firstName ? "border-red-500" : "border-border"}`}
                        placeholder="First name"
                      />
                      {customerFormErrors.firstName && (
                        <p className="mt-0.5 text-xs text-danger">{customerFormErrors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Last Name *</label>
                      <input
                        type="text"
                        value={customerForm.lastName}
                        onChange={(e) => updateCustomerField("lastName", e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${customerFormErrors.lastName ? "border-red-500" : "border-border"}`}
                        placeholder="Last name"
                      />
                      {customerFormErrors.lastName && (
                        <p className="mt-0.5 text-xs text-danger">{customerFormErrors.lastName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Email *</label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => updateCustomerField("email", e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${customerFormErrors.email ? "border-red-500" : "border-border"}`}
                        placeholder="Email address"
                      />
                      {customerFormErrors.email && (
                        <p className="mt-0.5 text-xs text-danger">{customerFormErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Phone</label>
                      <input
                        type="text"
                        value={customerForm.phone}
                        onChange={(e) => updateCustomerField("phone", e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${customerFormErrors.phone ? "border-red-500" : "border-border"}`}
                        placeholder="Phone number"
                      />
                      {customerFormErrors.phone && (
                        <p className="mt-0.5 text-xs text-danger">{customerFormErrors.phone}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
                    disabled={customerFormLoading}
                    className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {customerFormLoading ? "Saving..." : "Save Customer"}
                  </button>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="orderDate" className="block text-xs font-medium mb-0.5">
                Order Date *
              </label>
              <input
                id="orderDate"
                type="date"
                value={form.orderDate}
                onChange={(e) => updateField("orderDate", e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.orderDate ? "border-red-500" : "border-border"}`}
                required
              />
              {fieldErrors.orderDate && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.orderDate}</p>
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
              placeholder="Optional order notes"
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
                  <option value="Shipped">Shipped</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="shippingAddress" className="block text-xs font-medium mb-0.5">
              Shipping Address
            </label>
            <input
              id="shippingAddress"
              type="text"
              value={form.shippingAddress}
              onChange={(e) => updateField("shippingAddress", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label htmlFor="shippingCity" className="block text-xs font-medium mb-0.5">
                City
              </label>
              <input
                id="shippingCity"
                type="text"
                value={form.shippingCity}
                onChange={(e) => updateField("shippingCity", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="shippingState" className="block text-xs font-medium mb-0.5">
                State
              </label>
              <input
                id="shippingState"
                type="text"
                value={form.shippingState}
                onChange={(e) => updateField("shippingState", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="shippingZipCode" className="block text-xs font-medium mb-0.5">
                Zip Code
              </label>
              <input
                id="shippingZipCode"
                type="text"
                value={form.shippingZipCode}
                onChange={(e) => updateField("shippingZipCode", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="shippingCountry" className="block text-xs font-medium mb-0.5">
                Country
              </label>
              <input
                id="shippingCountry"
                type="text"
                value={form.shippingCountry}
                onChange={(e) => updateField("shippingCountry", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Order Items</label>
              <button
                type="button"
                onClick={addOrderItem}
                className="text-sm text-primary hover:underline font-medium"
              >
                + Add Item
              </button>
            </div>
            {fieldErrors.orderItems && (
              <p className="mb-2 text-sm text-danger">{fieldErrors.orderItems}</p>
            )}
            <div className="space-y-2">
              {form.orderItems.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-2 p-2 border border-border rounded-lg bg-background"
                >
                  <div className="flex-1">
                    <label className="block text-xs text-muted mb-1">Product</label>
                    <select
                      value={item.inventoryId}
                      onChange={(e) =>
                        updateOrderItem(index, "inventoryId", parseInt(e.target.value) || 0)
                      }
                      className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-sm ${fieldErrors[`orderItems_${index}_inventoryId`] ? "border-red-500" : "border-border"}`}
                    >
                      <option value={0}>Select product...</option>
                      {inventory
                        .filter((inv) => inv.isAvailable)
                        .map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.productName} - ${inv.unitPrice.toFixed(2)} (Stock: {inv.stockQuantity})
                          </option>
                        ))}
                    </select>
                    {fieldErrors[`orderItems_${index}_inventoryId`] && (
                      <p className="mt-1 text-xs text-danger">
                        {fieldErrors[`orderItems_${index}_inventoryId`]}
                      </p>
                    )}
                  </div>
                  <div className="w-full sm:w-28">
                    <label className="block text-xs text-muted mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateOrderItem(index, "quantity", parseInt(e.target.value) || 0)
                      }
                      className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${fieldErrors[`orderItems_${index}_quantity`] ? "border-red-500" : "border-border"}`}
                    />
                    {fieldErrors[`orderItems_${index}_quantity`] && (
                      <p className="mt-1 text-xs text-danger">
                        {fieldErrors[`orderItems_${index}_quantity`]}
                      </p>
                    )}
                  </div>
                  {form.orderItems.length > 1 && (
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="px-2 py-1 text-sm text-danger hover:bg-red-50 rounded-lg text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
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
                ? "Update Order"
                : "Create Order"}
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

      {/* Orders List */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">Orders List</h2>
          <button
            onClick={handlePrint}
            disabled={printLoading || orders.length === 0}
            className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {printLoading ? "Generating PDF..." : "Print"}
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Order #</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Customer</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Order Date</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Items</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Total</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Status</th>
                <th className="text-right px-3 py-1.5 text-xs font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-muted">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-background/50">
                    <td className="px-3 py-1.5 text-xs font-medium">{order.orderNumber}</td>
                    <td className="px-3 py-1.5 text-xs">{getCustomerName(order.customerId)}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {order.orderItems && order.orderItems.length > 0 ? (
                        <span title={order.orderItems.map((i) => `${i.productName} x${i.quantity}`).join(", ")}>
                          {order.orderItems.length} item{order.orderItems.length !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-xs">${order.totalAmount.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                     
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => handleEdit(order)}
                        className="text-primary hover:underline text-xs font-medium mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
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
          {orders.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted">No orders found.</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-2.5 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted">{getCustomerName(order.customerId)}</p>
                    <p className="text-xs text-muted">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs font-medium">${order.totalAmount.toFixed(2)}</p>
                    {order.orderItems && order.orderItems.length > 0 && (
                      <p className="text-xs text-muted mt-1">
                        {order.orderItems.map((i) => `${i.productName} x${i.quantity}`).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(order)}
                    className="text-primary text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
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

      {/* Hidden Print Template */}
      <div
        ref={printTemplateRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          padding: "2rem",
          backgroundColor: "#ffffff",
          fontFamily: "Arial, sans-serif",
          width: "210mm",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "1rem", textAlign: "center" }}>
          Orders Report
        </h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "0.5rem", fontSize: "12px" }}>
          Generated on {new Date().toLocaleString()}
        </p>
        {printFromDate && printToDate && (
          <p style={{ textAlign: "center", color: "#666", marginBottom: "2rem", fontSize: "12px" }}>
            Period: {new Date(printFromDate).toLocaleDateString()} - {new Date(printToDate).toLocaleDateString()}
          </p>
        )}

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #333",
            fontSize: "11px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ border: "1px solid #333", padding: "8px", textAlign: "left", fontWeight: "bold" }}>
                Order #
              </th>
              <th style={{ border: "1px solid #333", padding: "8px", textAlign: "left", fontWeight: "bold" }}>
                Customer
              </th>
              <th style={{ border: "1px solid #333", padding: "8px", textAlign: "left", fontWeight: "bold" }}>
                Order Date
              </th>
              <th style={{ border: "1px solid #333", padding: "8px", textAlign: "left", fontWeight: "bold" }}>
                Products
              </th>
              <th style={{ border: "1px solid #333", padding: "8px", textAlign: "right", fontWeight: "bold" }}>
                Total
              </th>
              <th style={{ border: "1px solid #333", padding: "8px", textAlign: "left", fontWeight: "bold" }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrdersForPrint.map((order) => (
              <tr key={order.id}>
                <td style={{ border: "1px solid #333", padding: "8px" }}>{order.orderNumber}</td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>{getCustomerName(order.customerId)}</td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  {new Date(order.orderDate).toLocaleDateString()}
                </td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  {order.orderItems && order.orderItems.length > 0
                    ? order.orderItems
                        .map((item) => `${item.productName} x${item.quantity} @ $${item.unitPrice.toFixed(2)}`)
                        .join(", ")
                    : "-"}
                </td>
                <td style={{ border: "1px solid #333", padding: "8px", textAlign: "right" }}>
                  ${order.totalAmount.toFixed(2)}
                </td>
                <td style={{ border: "1px solid #333", padding: "8px" }}>{order.status}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
              <td colSpan={4} style={{ border: "1px solid #333", padding: "8px", textAlign: "right" }}>
                Grand Total:
              </td>
              <td style={{ border: "1px solid #333", padding: "8px", textAlign: "right", fontWeight: "bold" }}>
                ${filteredOrdersForPrint.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
              </td>
              <td style={{ border: "1px solid #333", padding: "8px" }}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

