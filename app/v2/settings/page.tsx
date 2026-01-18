'use client';

import { useOrg, withOrgProtection } from '@/lib/org-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/v2/color-picker';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EmptyStateGuard } from '../components/empty-state-guard';
import { AlertCircle, CheckCircle } from 'lucide-react';

function SettingsPage() {
  const { organization, isAdmin } = useOrg();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settings, setSettings] = useState({
    brandColor: 'blue',
    organizationName: '',
    website: '',
    timezone: 'UTC',
  });

  useEffect(() => {
    if (organization) {
      const orgSettings = organization.settings || {};
      setSettings({
        brandColor: orgSettings.brand_color || 'blue',
        organizationName: organization.name || '',
        website: orgSettings.website || '',
        timezone: orgSettings.timezone || 'UTC',
      });
    }
  }, [organization]);

  const handleSave = async () => {
    if (!organization || !isAdmin) {
      setMessage({ type: 'error', text: 'You do not have permission to update settings' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('saas_organizations')
        .update({
          name: settings.organizationName,
          website: settings.website,
          settings: {
            ...organization.settings,
            brand_color: settings.brandColor,
            timezone: settings.timezone,
          },
        })
        .eq('id', organization.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-lg font-semibold">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can access settings.</p>
      </div>
    );
  }

  return (
    <EmptyStateGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your organization settings and brand</p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid gap-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Update your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={settings.organizationName}
                  onChange={(e) =>
                    setSettings({ ...settings, organizationName: e.target.value })
                  }
                  placeholder="Your organization name"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={settings.website}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                  placeholder="https://example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  disabled={loading}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="UTC">UTC</option>
                  <option value="IST">IST (Indian Standard Time)</option>
                  <option value="PST">PST (Pacific Standard Time)</option>
                  <option value="EST">EST (Eastern Standard Time)</option>
                  <option value="GMT">GMT (Greenwich Mean Time)</option>
                  <option value="CET">CET (Central European Time)</option>
                  <option value="JST">JST (Japan Standard Time)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Brand Customization */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Customization</CardTitle>
              <CardDescription>Customize the look and feel of your admin dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPicker
                value={settings.brandColor}
                onChange={(color) => setSettings({ ...settings, brandColor: color })}
                disabled={loading}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading} size="lg">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </EmptyStateGuard>
  );
}

export default withOrgProtection(SettingsPage);
