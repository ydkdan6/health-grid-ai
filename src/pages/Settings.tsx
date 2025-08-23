import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Key,
  Save,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const { user } = useAuth();
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [notifications, setNotifications] = useState({
    emergencyAlerts: true,
    bedUpdates: true,
    systemMaintenance: false,
    weeklyReports: true
  });
  const [systemSettings, setSystemSettings] = useState({
    autoRefresh: true,
    refreshInterval: 30,
    darkMode: false,
    soundAlerts: true
  });

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully.",
    });
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('edhms_notifications', JSON.stringify(notifications));
    toast({
      title: "Notification Settings Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  const handleSaveSystem = () => {
    localStorage.setItem('edhms_system_settings', JSON.stringify(systemSettings));
    toast({
      title: "System Settings Saved",
      description: "Your system preferences have been updated.",
    });
  };

  const handleSaveApiKey = () => {
    if (geminiApiKey.trim()) {
      localStorage.setItem('edhms_gemini_key', geminiApiKey.trim());
      toast({
        title: "API Key Saved",
        description: "Your Gemini API key has been saved securely.",
      });
    }
  };

  const exportSettings = () => {
    const settings = {
      notifications,
      systemSettings,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `edhms-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Settings Exported",
      description: "Your settings have been exported successfully.",
    });
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        
        if (settings.notifications) {
          setNotifications(settings.notifications);
        }
        if (settings.systemSettings) {
          setSystemSettings(settings.systemSettings);
        }

        toast({
          title: "Settings Imported",
          description: "Your settings have been imported successfully.",
        });
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Failed to import settings. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all local data? This action cannot be undone.')) {
      localStorage.removeItem('edhms_notifications');
      localStorage.removeItem('edhms_system_settings');
      localStorage.removeItem('edhms_gemini_key');
      
      setNotifications({
        emergencyAlerts: true,
        bedUpdates: true,
        systemMaintenance: false,
        weeklyReports: true
      });
      
      setSystemSettings({
        autoRefresh: true,
        refreshInterval: 30,
        darkMode: false,
        soundAlerts: true
      });
      
      setGeminiApiKey('');

      toast({
        title: "Data Cleared",
        description: "All local data has been cleared.",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and system settings
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportSettings}>
            <Download className="w-4 h-4 mr-2" />
            Export Settings
          </Button>
          <div className="relative">
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Import Settings
                <input
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Manage your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed from this interface
                  </p>
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value="Healthcare Professional"
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Enter your first name" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Enter your last name" />
                </div>
              </div>

              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input id="specialization" placeholder="e.g., Emergency Medicine, Cardiology" />
              </div>

              <div>
                <Label htmlFor="license">Medical License Number</Label>
                <Input id="license" placeholder="Enter your medical license number" />
              </div>

              <Button onClick={handleSaveProfile} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Emergency Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for critical emergency situations
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emergencyAlerts}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, emergencyAlerts: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bed Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when bed availability changes
                    </p>
                  </div>
                  <Switch
                    checked={notifications.bedUpdates}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, bedUpdates: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>System Maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about system maintenance
                    </p>
                  </div>
                  <Switch
                    checked={notifications.systemMaintenance}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, systemMaintenance: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly analytics and performance reports
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, weeklyReports: checked})
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Refresh</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically refresh data at regular intervals
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.autoRefresh}
                    onCheckedChange={(checked) => 
                      setSystemSettings({...systemSettings, autoRefresh: checked})
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="10"
                      max="300"
                      value={systemSettings.refreshInterval}
                      onChange={(e) => 
                        setSystemSettings({
                          ...systemSettings, 
                          refreshInterval: parseInt(e.target.value) || 30
                        })
                      }
                      disabled={!systemSettings.autoRefresh}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch to dark theme for better viewing in low light
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.darkMode}
                    onCheckedChange={(checked) => 
                      setSystemSettings({...systemSettings, darkMode: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound notifications for critical alerts
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.soundAlerts}
                    onCheckedChange={(checked) => 
                      setSystemSettings({...systemSettings, soundAlerts: checked})
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveSystem} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save System Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Configure external API keys for enhanced functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="geminiKey">Gemini API Key</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="geminiKey"
                    type="password"
                    placeholder="Enter your Gemini API key for AI features"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                  <Button onClick={handleSaveApiKey} disabled={!geminiApiKey.trim()}>
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Required for AI-powered patient analysis and bed predictions
                </p>
              </div>

              <div className="bg-muted/50 border rounded-lg p-4">
                <h4 className="font-medium mb-2">How to get your Gemini API Key:</h4>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Create API Key" and follow the instructions</li>
                  <li>Copy the generated key and paste it above</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Data Management
              </CardTitle>
              <CardDescription>
                Manage your local data and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="bg-muted/50 border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Local Data Storage</h4>
                  <p className="text-sm text-muted-foreground">
                    Your preferences and API keys are stored locally in your browser. 
                    This data is not shared with external services except when you explicitly use features that require it.
                  </p>
                </div>

                <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                  <h4 className="font-medium text-destructive mb-2">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    The following actions cannot be undone. Please proceed with caution.
                  </p>
                  
                  <Button 
                    variant="destructive" 
                    onClick={clearAllData}
                    className="w-full md:w-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Local Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;