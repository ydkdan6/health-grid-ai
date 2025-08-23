import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  Users, 
  Building2, 
  AlertTriangle, 
  Bed, 
  TrendingUp,
  Clock,
  MapPin,
  Phone
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DashboardStats {
  totalHospitals: number;
  totalPatients: number;
  activeAlerts: number;
  availableBeds: number;
}

interface Hospital {
  id: string;
  name: string;
  available_beds: number;
  bed_capacity: number;
  status: string;
  emergency_contact: string;
}

interface Alert {
  id: string;
  title: string;
  severity: string;
  alert_type: string;
  status: string;
  created_at: string;
  hospitals: { name: string };
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalHospitals: 0,
    totalPatients: 0,
    activeAlerts: 0,
    availableBeds: 0
  });
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch hospitals
      const { data: hospitalsData, error: hospitalsError } = await supabase
        .from('hospitals')
        .select('*');

      // Fetch patients count
      const { count: patientsCount, error: patientsError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Fetch active alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('emergency_alerts')
        .select(`
          *,
          hospitals!inner(name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (hospitalsError) throw hospitalsError;
      if (patientsError) throw patientsError;
      if (alertsError) throw alertsError;

      const totalAvailableBeds = hospitalsData?.reduce((sum, hospital) => sum + hospital.available_beds, 0) || 0;

      setStats({
        totalHospitals: hospitalsData?.length || 0,
        totalPatients: patientsCount || 0,
        activeAlerts: alertsData?.length || 0,
        availableBeds: totalAvailableBeds
      });

      setHospitals(hospitalsData || []);
      setAlerts(alertsData || []);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string, availableBeds: number, totalBeds: number) => {
    const occupancyRate = ((totalBeds - availableBeds) / totalBeds) * 100;
    
    if (status !== 'active') return 'destructive';
    if (occupancyRate >= 90) return 'destructive';
    if (occupancyRate >= 75) return 'secondary';
    return 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Emergency Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.email}
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHospitals}</div>
            <p className="text-xs text-muted-foreground">Connected facilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableBeds}</div>
            <p className="text-xs text-muted-foreground">Ready for patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">In system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hospitals" className="w-full">
        <TabsList>
          <TabsTrigger value="hospitals">Hospital Status</TabsTrigger>
          <TabsTrigger value="alerts">Emergency Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="hospitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Bed Availability</CardTitle>
              <CardDescription>Real-time bed capacity across connected hospitals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hospitals.map((hospital) => (
                  <Card key={hospital.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{hospital.name}</CardTitle>
                        <Badge variant={getStatusColor(hospital.status, hospital.available_beds, hospital.bed_capacity)}>
                          {hospital.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Available Beds</span>
                        <span className="font-semibold">{hospital.available_beds}/{hospital.bed_capacity}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${Math.max(0, (hospital.available_beds / hospital.bed_capacity) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="w-3 h-3 mr-1" />
                        {hospital.emergency_contact}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Emergency Alerts</CardTitle>
              <CardDescription>Critical alerts requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <Card key={alert.id} className="border-l-4 border-l-destructive">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                              <Badge variant="outline">{alert.alert_type}</Badge>
                            </div>
                            <h4 className="font-semibold">{alert.title}</h4>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {alert.hospitals.name}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(alert.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No active alerts at this time</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;