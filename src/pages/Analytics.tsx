import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Users, 
  Building2, 
  Bed,
  AlertTriangle,
  Calendar,
  Download,
  Brain
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { predictBedAvailability } from '@/lib/gemini';

interface AnalyticsData {
  totalPatients: number;
  totalHospitals: number;
  totalBeds: number;
  availableBeds: number;
  activeAlerts: number;
  emergencyVisits: number;
  bedOccupancyRate: number;
  alertsByType: { [key: string]: number };
  dailyAdmissions: { date: string; count: number }[];
  hospitalPerformance: {
    id: string;
    name: string;
    occupancyRate: number;
    availableBeds: number;
    totalBeds: number;
    alertCount: number;
  }[];
}

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [bedPredictions, setBedPredictions] = useState<any>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      // Fetch hospitals
      const { data: hospitals, error: hospitalsError } = await supabase
        .from('hospitals')
        .select('*');

      // Fetch patients
      const { count: totalPatients, error: patientsError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Fetch medical records for the time range
      const { data: medicalRecords, error: recordsError } = await supabase
        .from('medical_records')
        .select('*')
        .gte('visit_date', startDate.toISOString())
        .lte('visit_date', endDate.toISOString());

      // Fetch alerts for the time range
      const { data: alerts, error: alertsError } = await supabase
        .from('emergency_alerts')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (hospitalsError || patientsError || recordsError || alertsError) {
        throw new Error('Failed to fetch analytics data');
      }

      // Calculate metrics
      const totalBeds = hospitals?.reduce((sum, h) => sum + h.bed_capacity, 0) || 0;
      const availableBeds = hospitals?.reduce((sum, h) => sum + h.available_beds, 0) || 0;
      const bedOccupancyRate = totalBeds > 0 ? ((totalBeds - availableBeds) / totalBeds) * 100 : 0;

      // Emergency visits
      const emergencyVisits = medicalRecords?.filter(r => r.visit_type === 'emergency').length || 0;

      // Active alerts
      const activeAlerts = alerts?.filter(a => a.status === 'active').length || 0;

      // Alerts by type
      const alertsByType = alerts?.reduce((acc: { [key: string]: number }, alert) => {
        acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
        return acc;
      }, {}) || {};

      // Daily admissions
      const dailyAdmissions = generateDailyAdmissions(medicalRecords || [], startDate, endDate);

      // Hospital performance
      const hospitalPerformance = hospitals?.map(hospital => {
        const hospitalAlerts = alerts?.filter(a => a.hospital_id === hospital.id).length || 0;
        return {
          id: hospital.id,
          name: hospital.name,
          occupancyRate: hospital.bed_capacity > 0 
            ? ((hospital.bed_capacity - hospital.available_beds) / hospital.bed_capacity) * 100 
            : 0,
          availableBeds: hospital.available_beds,
          totalBeds: hospital.bed_capacity,
          alertCount: hospitalAlerts
        };
      }) || [];

      setAnalyticsData({
        totalPatients: totalPatients || 0,
        totalHospitals: hospitals?.length || 0,
        totalBeds,
        availableBeds,
        activeAlerts,
        emergencyVisits,
        bedOccupancyRate,
        alertsByType,
        dailyAdmissions,
        hospitalPerformance
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDailyAdmissions = (records: any[], startDate: Date, endDate: Date) => {
    const dailyData: { [key: string]: number } = {};
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    records.forEach(record => {
      const recordDate = new Date(record.visit_date).toISOString().split('T')[0];
      if (dailyData[recordDate] !== undefined) {
        dailyData[recordDate]++;
      }
    });

    return Object.entries(dailyData).map(([date, count]) => ({
      date,
      count
    }));
  };

  const generateBedPredictions = async () => {
    if (!geminiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API key to generate predictions",
        variant: "destructive",
      });
      return;
    }

    if (!analyticsData) return;

    setPredictionLoading(true);
    try {
      const predictions = await predictBedAvailability(
        analyticsData.hospitalPerformance,
        {
          currentOccupancy: analyticsData.bedOccupancyRate,
          emergencyVisits: analyticsData.emergencyVisits,
          activeAlerts: analyticsData.activeAlerts
        }
      );

      setBedPredictions(predictions);
      toast({
        title: "Predictions Generated",
        description: "AI predictions for bed availability have been generated",
      });
    } catch (error: any) {
      console.error('Error generating predictions:', error);
      toast({
        title: "Prediction Error", 
        description: error.message || "Failed to generate predictions",
        variant: "destructive",
      });
    } finally {
      setPredictionLoading(false);
    }
  };

  const exportData = () => {
    if (!analyticsData) return;

    const exportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      metrics: analyticsData
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `emergency-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Data Exported",
      description: "Analytics data has been downloaded as JSON file",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground">Unable to load analytics data at this time.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Healthcare system performance metrics and insights
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.bedOccupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.totalBeds - analyticsData.availableBeds}/{analyticsData.totalBeds} beds occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Visits</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.emergencyVisits}</div>
            <p className="text-xs text-muted-foreground">In selected time period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalHospitals}</div>
            <p className="text-xs text-muted-foreground">Connected facilities</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hospitals">Hospital Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alert Analysis</TabsTrigger>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Admissions Trend</CardTitle>
              <CardDescription>Patient admissions over the selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.dailyAdmissions.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${Math.max(5, (day.count / Math.max(...analyticsData.dailyAdmissions.map(d => d.count))) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{day.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hospitals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Performance Metrics</CardTitle>
              <CardDescription>Bed occupancy and alert counts by hospital</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.hospitalPerformance.map((hospital) => (
                  <div key={hospital.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{hospital.name}</h4>
                      <Badge variant={hospital.occupancyRate > 90 ? 'destructive' : hospital.occupancyRate > 75 ? 'secondary' : 'default'}>
                        {hospital.occupancyRate.toFixed(1)}% occupied
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Available Beds</div>
                        <div className="font-medium">{hospital.availableBeds}/{hospital.totalBeds}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Occupancy Rate</div>
                        <div className="font-medium">{hospital.occupancyRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Alerts</div>
                        <div className="font-medium">{hospital.alertCount}</div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-secondary rounded-full h-2 mt-3">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${Math.max(0, (hospital.availableBeds / hospital.totalBeds) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Distribution</CardTitle>
              <CardDescription>Breakdown of alerts by type in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analyticsData.alertsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{type.replace('_', ' ')}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ 
                            width: `${(count / Math.max(...Object.values(analyticsData.alertsByType))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                AI-Powered Bed Availability Predictions
              </CardTitle>
              <CardDescription>
                Use Gemini AI to predict bed availability and resource needs for the next 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <input
                  type="password"
                  placeholder="Enter your Gemini API key"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button 
                  onClick={generateBedPredictions} 
                  disabled={predictionLoading || !geminiKey.trim()}
                >
                  {predictionLoading ? 'Generating...' : 'Generate Predictions'}
                </Button>
              </div>

              {bedPredictions && (
                <div className="space-y-4 mt-6">
                  <h4 className="font-medium">24-Hour Predictions</h4>
                  
                  {bedPredictions.predictions?.map((pred: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Hospital #{pred.hospitalId}</span>
                        <Badge variant={pred.expectedOccupancy > 90 ? 'destructive' : 'default'}>
                          {pred.expectedOccupancy}% occupancy predicted
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Predicted available beds: {pred.availableBeds}
                      </div>
                    </div>
                  ))}

                  {bedPredictions.alerts?.length > 0 && (
                    <div>
                      <h5 className="font-medium text-destructive mb-2">Capacity Alerts</h5>
                      {bedPredictions.alerts.map((alert: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-l-destructive bg-destructive/10 p-3 rounded">
                          <Badge variant="destructive" className="mb-1">{alert.severity}</Badge>
                          <p className="text-sm">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {bedPredictions.recommendations?.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Recommendations</h5>
                      <ul className="space-y-1">
                        {bedPredictions.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;