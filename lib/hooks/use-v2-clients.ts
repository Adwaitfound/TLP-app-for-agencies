/**
 * Data adapter hook to transform SaaS multi-tenant data
 * to match the main app's client schema
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/lib/org-context';
import type { Client } from '@/types';

interface V2ClientData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

export function useV2Clients() {
  const { organization } = useOrg();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) return;
    
    fetchClients();
  }, [organization]);

  async function fetchClients() {
    const supabase = createClient();
    setLoading(true);
    setError(null);

    try {
      // Fetch child organizations (clients) for this agency
      const { data: childOrgs, error: clientsError } = await supabase
        .from('saas_organizations')
        .select('*')
        .eq('parent_id', organization!.id)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Transform v2 SaaS schema to match main app Client type
      const transformedClients: Client[] = (childOrgs || []).map((org: V2ClientData) => ({
        id: org.id,
        user_id: null, // v2 doesn't have user_id per client
        company_name: org.name,
        contact_person: org.settings?.contact_person || '',
        email: org.settings?.email || '',
        phone: org.settings?.phone || '',
        address: org.settings?.address || '',
        total_projects: 0, // TODO: Fetch from projects table
        total_revenue: 0, // TODO: Calculate from invoices
        status: org.status === 'active' ? 'active' : 'inactive',
        created_at: org.created_at,
        // Add any additional fields needed by main components
        services: [], // TODO: Map from projects
        projects: [], // TODO: Fetch related projects
        invoices: [], // TODO: Fetch related invoices
      }));

      setClients(transformedClients);
    } catch (err: any) {
      console.error('Error fetching v2 clients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addClient(data: {
    company_name: string;
    contact_person: string;
    email: string;
    phone?: string;
    address?: string;
  }) {
    const supabase = createClient();

    // Create child organization for client
    const { data: newOrg, error } = await supabase
      .from('saas_organizations')
      .insert({
        name: data.company_name,
        slug: data.company_name.toLowerCase().replace(/\s+/g, '-'),
        parent_id: organization!.id,
        plan: 'free',
        status: 'active',
        settings: {
          contact_person: data.contact_person,
          email: data.email,
          phone: data.phone,
          address: data.address,
        },
      })
      .select()
      .single();

    if (error) throw error;

    await fetchClients();
    return newOrg;
  }

  async function updateClient(clientId: string, data: {
    company_name?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const supabase = createClient();

    const { error } = await supabase
      .from('saas_organizations')
      .update({
        name: data.company_name,
        settings: {
          contact_person: data.contact_person,
          email: data.email,
          phone: data.phone,
          address: data.address,
        },
      })
      .eq('id', clientId);

    if (error) throw error;

    await fetchClients();
  }

  async function deleteClient(clientId: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from('saas_organizations')
      .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
      .eq('id', clientId);

    if (error) throw error;

    await fetchClients();
  }

  return {
    clients,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient,
    refresh: fetchClients,
  };
}
