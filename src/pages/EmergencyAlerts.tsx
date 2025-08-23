import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Plus, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  hospital_id: string;
  patient_id?: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_by?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  hospitals: { name: string };
  patients?: { name: string; patient_id: string };
}

interface Hospital {
  id: string;
  name: string;
}

const AlertModal: React.FC<{ alert?: Alert; onSave: () => void }> = ({ alert, onSave }) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [formData, setFormData] = useState({
    hospital_id: alert?.hospital_id || '',
    alert_type: alert?.alert_type || 'patient_emergency',
    severity: alert?.severity || 'medium',
    title: alert?.title || '',
    description: alert?.description || ''
  });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchHospitals();
    }
  }, [open]);

  const fetchHospitals = async () => {
    const { data } = await supabase
      .from('hospitals')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    
    setHospitals(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (alert) {
        // Update existing alert
        const { error } = await supabase
          .from('emergency_alerts')
          .update(formData)
          .eq('id', alert.id);
        if (error) throw error;
      } else {
        // Create new alert
        const { error } = await supabase
          .from('emergency_alerts')
          .insert([formData]);
        if (error) throw error;
      }

      toast({
        title: alert ? "Alert Updated" : "Alert Created",
        description: alert ? "Alert has been updated successfully" : "New emergency alert has been created",
      });

      setOpen(false);
      onSave();
    } catch (error: any) {
      console.error('Error saving alert:', error);
      toast({
        title: "Error",
        description: "Failed to save alert",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{alert ? 'Edit Alert' : 'Create Emergency Alert'}</DialogTitle>
          <DialogDescription>
            {alert ? 'Update alert information' : 'Create a new emergency alert to notify medical staff'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hospital">Hospital</Label>
              <Select value={formData.hospital_id} onValueChange={(value) => setFormData({...formData, hospital_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alert_type">Alert Type</Label>
              <Select value={formData.alert_type} onValueChange={(value) => setFormData({...formData, alert_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bed_shortage">Bed Shortage</SelectItem>
                  <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                  <SelectItem value="staff_shortage">Staff Shortage</SelectItem>
                  <SelectItem value="patient_emergency">Patient Emergency</SelectItem>
                  <SelectItem value="disaster">Disaster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select value={formData.severity} onValueChange={(value) => setFormData({...formData, severity: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Alert Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : alert ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EmergencyAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    fetchAlerts();
    
    // Set up real-time updates
    const channel = supabase
      .channel('emergency-alerts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'emergency_alerts' },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select(`
          *,
          hospitals!inner(name),
          patients(name, patient_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch emergency alerts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('emergency_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      
      toast({
        title: "Alert Resolved",
        description: "Emergency alert has been marked as resolved",
      });
      
      fetchAlerts();
    } catch (error: any) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive",
      });
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('emergency_alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId);

      if (error) throw error;
      
      toast({
        title: "Alert Acknowledged",
        description: "Emergency alert has been acknowledged",
      });
      
      fetchAlerts();
    } catch (error: any) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'default';
      case 'acknowledged': return 'secondary';
      case 'active': return 'destructive';
      default: return 'secondary';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'patient_emergency': return '🚑';
      case 'bed_shortage': return '🏥';
      case 'equipment_failure': return '⚙️';
      case 'staff_shortage': return '👥';
      case 'disaster': return '🌪️';
      default: return '⚠️';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter !== 'all' && alert.status !== filter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const acknowledgedAlerts = alerts.filter(alert => alert.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading emergency alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Emergency Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage emergency situations across all hospitals
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchAlerts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <AlertModal onSave={fetchAlerts} />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{activeAlerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <User className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acknowledgedAlerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedAlerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active ({activeAlerts.length})</TabsTrigger>
          <TabsTrigger value="acknowledged">Acknowledged ({acknowledgedAlerts.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedAlerts.length})</TabsTrigger>
          <TabsTrigger value="all">All Alerts</TabsTrigger>
        </TabsList>

        <div className="mt-6 flex space-x-4">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts.filter(alert => severityFilter === 'all' || alert.severity === severityFilter).map(alert => (
            <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} onAcknowledge={acknowledgeAlert} />
          ))}
        </TabsContent>

        <TabsContent value="acknowledged" className="space-y-4">
          {acknowledgedAlerts.filter(alert => severityFilter === 'all' || alert.severity === severityFilter).map(alert => (
            <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} onAcknowledge={acknowledgeAlert} />
          ))}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {resolvedAlerts.filter(alert => severityFilter === 'all' || alert.severity === severityFilter).map(alert => (
            <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} onAcknowledge={acknowledgeAlert} />
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredAlerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert} onAcknowledge={acknowledgeAlert} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AlertCard: React.FC<{ 
  alert: Alert; 
  onResolve: (id: string) => void; 
  onAcknowledge: (id: string) => void; 
}> = ({ alert, onResolve, onAcknowledge }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'default';
      case 'acknowledged': return 'secondary';
      case 'active': return 'destructive';
      default: return 'secondary';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'patient_emergency': return '🚑';
      case 'bed_shortage': return '🏥';
      case 'equipment_failure': return '⚙️';
      case 'staff_shortage': return '👥';
      case 'disaster': return '🌪️';
      default: return '⚠️';
    }
  };

  return (
    <Card className={`border-l-4 ${
      alert.severity === 'critical' ? 'border-l-destructive' : 
      alert.severity === 'high' ? 'border-l-destructive' : 'border-l-primary'
    }`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getAlertTypeIcon(alert.alert_type)}</span>
              <div className="flex items-center space-x-2">
                <Badge variant={getSeverityColor(alert.severity)}>
                  {alert.severity}
                </Badge>
                <Badge variant="outline">{alert.alert_type.replace('_', ' ')}</Badge>
                <Badge variant={getStatusColor(alert.status)}>
                  {alert.status}
                </Badge>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-lg">{alert.title}</h4>
              <p className="text-muted-foreground mt-1">{alert.description}</p>
            </div>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {alert.hospitals.name}
              </div>
              {alert.patients && (
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {alert.patients.name} (#{alert.patients.patient_id})
                </div>
              )}
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>

            {alert.resolved_at && (
              <div className="text-sm text-green-600">
                Resolved: {new Date(alert.resolved_at).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2 ml-4">
            {alert.status === 'active' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAcknowledge(alert.id)}
                >
                  <User className="w-4 h-4 mr-2" />
                  Acknowledge
                </Button>
                <Button
                  size="sm"
                  onClick={() => onResolve(alert.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Resolve
                </Button>
              </>
            )}
            {alert.status === 'acknowledged' && (
              <Button
                size="sm"
                onClick={() => onResolve(alert.id)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Resolve
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmergencyAlerts;