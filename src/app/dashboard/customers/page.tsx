"use client";

import { useState, useEffect, useCallback } from "react";
import { customerApi, Customer, CustomerFormData } from "@/lib/api";
import { validateCustomer, FieldErrors } from "@/lib/validation";

const emptyForm: CustomerFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customerApi.getAll();
      setCustomers(res.data);
    } catch {
      setError("Failed to load customers.");
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();

    const errors = validateCustomer(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      if (editingId) {
        await customerApi.update(editingId, form);
        setSuccess("Customer updated successfully.");
      } else {
        await customerApi.create(form);
        setSuccess("Customer created successfully.");
      }
      setForm(emptyForm);
      setEditingId(null);
      setFieldErrors({});
      await fetchCustomers();
    } catch {
      setError(editingId ? "Failed to update customer." : "Failed to create customer.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    clearMessages();
    setFieldErrors({});
    setEditingId(customer.id);
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zipCode: customer.zipCode || "",
      country: customer.country || "",
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    clearMessages();
    try {
      await customerApi.delete(id);
      setSuccess("Customer deleted successfully.");
      await fetchCustomers();
    } catch {
      setError("Failed to delete customer.");
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFieldErrors({});
    clearMessages();
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <h1 className="text-2xl font-bold">Customer Management</h1>

      {/* Form */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border p-3">
        <h2 className="text-base font-semibold mb-1">
          {editingId ? "Edit Customer" : "Add New Customer"}
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
              <label htmlFor="firstName" className="block text-xs font-medium mb-0.5">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.firstName ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.firstName && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.firstName}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-xs font-medium mb-0.5">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.lastName ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.lastName && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-0.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.email ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.email && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-medium mb-0.5">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${fieldErrors.phone ? "border-red-500" : "border-border"}`}
              />
              {fieldErrors.phone && (
                <p className="mt-0.5 text-xs text-danger">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-xs font-medium mb-0.5">
              Address
            </label>
            <input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label htmlFor="city" className="block text-xs font-medium mb-0.5">
                City
              </label>
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-xs font-medium mb-0.5">
                State
              </label>
              <input
                id="state"
                type="text"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="zipCode" className="block text-xs font-medium mb-0.5">
                Zip Code
              </label>
              <input
                id="zipCode"
                type="text"
                value={form.zipCode}
                onChange={(e) => update("zipCode", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-xs font-medium mb-0.5">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
                ? "Update Customer"
                : "Add Customer"}
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

      {/* Customer List */}
      <div className="bg-card-bg rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <h2 className="text-base font-semibold">Customers List</h2>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">ID</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Name</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Email</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Phone</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">City</th>
                <th className="text-left px-3 py-1.5 text-xs font-medium text-muted">Status</th>
                <th className="text-right px-3 py-1.5 text-xs font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-muted">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-background/50">
                    <td className="px-3 py-1.5 text-xs">{customer.id}</td>
                    <td className="px-3 py-1.5 text-xs font-medium">
                      {customer.firstName} {customer.lastName}
                    </td>
                    <td className="px-3 py-1.5 text-xs">{customer.email}</td>
                    <td className="px-3 py-1.5 text-xs">{customer.phone || "-"}</td>
                    <td className="px-3 py-1.5 text-xs">{customer.city || "-"}</td>
                    <td className="px-3 py-1.5 text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-primary hover:underline text-xs font-medium mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
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
          {customers.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted">No customers found.</div>
          ) : (
            customers.map((customer) => (
              <div key={customer.id} className="p-2.5 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="text-xs text-muted">{customer.email}</p>
                    {customer.phone && (
                      <p className="text-xs text-muted">{customer.phone}</p>
                    )}
                    {customer.city && (
                      <p className="text-xs text-muted">
                        {customer.city}{customer.state ? `, ${customer.state}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted">#{customer.id}</span>
                    <div className="mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="text-primary text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
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
