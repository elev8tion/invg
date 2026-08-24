import { useCallback, useEffect, useState } from 'react';
import { customerService } from '../lib/db';

/**
 * Customer data for one business, backed by NoCodeBackend.
 *
 * This replaces four separate localStorage copies (App, InvoiceGenerator,
 * CustomerManagement, CustomerPage) that each read `localStorage.customers`
 * independently and wrote back over each other. Customers created in the UI
 * never reached the database, and customers already in the database never
 * appeared in the UI.
 *
 * Every consumer calls this hook with the same businessId and gets the same
 * source of truth. Writes go to the database first, then refresh the list.
 */
export default function useCustomers(businessId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!businessId) {
      setCustomers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCustomers(await customerService.getCustomers(businessId));
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError(err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Strip UI-only fields and attach the business before writing. */
  const toRecord = (customer) => {
    const { id, createdAt, created_at, updated_at, user_id, ...fields } = customer;
    return { ...fields, business_id: businessId };
  };

  const addCustomer = useCallback(
    async (customer) => {
      const created = await customerService.createCustomer({
        ...toRecord(customer),
        is_active: 1,
      });
      await reload();
      return created;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessId, reload]
  );

  const updateCustomer = useCallback(
    async (customerId, updates) => {
      const updated = await customerService.updateCustomer(customerId, toRecord(updates));
      await reload();
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessId, reload]
  );

  /** Soft delete -- the row stays, is_active flips to 0. */
  const deleteCustomer = useCallback(
    async (customerId) => {
      await customerService.deleteCustomer(customerId);
      await reload();
    },
    [reload]
  );

  return { customers, loading, error, reload, addCustomer, updateCustomer, deleteCustomer };
}
