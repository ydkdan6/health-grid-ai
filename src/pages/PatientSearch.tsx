import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Activity, FileText, AlertTriangle, Plus, Brain } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { analyzePatientData } from '@/lib/gemini';

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  diagnosis?: string;
  symptoms?: string[];
  treatment?: string;
  severity_level?: string;
  visit_date: string;
  visit_type: string;
  status: string;
  hospitals: { name: string };
}

interface GeminiAPIKeyModalProps {
  onKeySubmitted: (key: string) => void;
}

const GeminiAPIKeyModal: React.FC<GeminiAPIKeyModalProps> = ({ onKeySubmitted }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onKeySubmitted(apiKey.trim());
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-2">
          <Brain className="w-4 h-4 mr-2" />
          AI Analysis
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Analysis Setup</DialogTitle>
          <DialogDescription>
            Enter your Gemini API key to enable AI-powered patient analysis
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="apiKey">Gemini API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Start AI Analysis
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PatientSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const searchPatients = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,patient_id.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error('Error searching patients:', error);
      toast({
        title: "Search Error",
        description: "Failed to search patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalRecords = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          hospitals!inner(name)
        `)
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setMedicalRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching medical records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch medical records",
        variant: "destructive",
      });
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    fetchMedicalRecords(patient.id);
    setAiAnalysis(null); // Reset AI analysis when switching patients
  };

  const handleGeminiKeySubmit = async (key: string) => {
    setGeminiKey(key);
    if (selectedPatient && medicalRecords.length > 0) {
      await performAIAnalysis(key);
    }
  };

  const performAIAnalysis = async (apiKey?: string) => {
    if (!selectedPatient || !medicalRecords.length) return;
    
    const keyToUse = apiKey || geminiKey;
    if (!keyToUse) return;

    setAnalysisLoading(true);
    try {
      // Initialize Gemini with the API key
      const { initializeGemini } = await import('@/lib/gemini');
      initializeGemini(keyToUse);

      const analysis = await analyzePatientData(selectedPatient, medicalRecords);
      setAiAnalysis(analysis);
      
      toast({
        title: "AI Analysis Complete",
        description: "Patient data has been analyzed successfully",
      });
    } catch (error: any) {
      console.error('Error performing AI analysis:', error);
      toast({
        title: "AI Analysis Error",
        description: error.message || "Failed to analyze patient data",
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getSeverityColor = (severity?: string) => {
    if (!severity) return 'secondary';
    switch (severity.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Search & Records</h1>
          <p className="text-muted-foreground mt-1">
            Search and analyze patient medical histories using AI
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Search</CardTitle>
          <CardDescription>Search by name, patient ID, or phone number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Enter patient name, ID, or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchPatients()}
              />
            </div>
            <Button onClick={searchPatients} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Search Results ({patients.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {patients.length > 0 ? (
              patients.map((patient) => (
                <div
                  key={patient.id}
                  className={`p-3 rounded-md border cursor-pointer transition-colors hover:bg-accent ${
                    selectedPatient?.id === patient.id ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => handlePatientSelect(patient)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {patient.patient_id}</p>
                      {patient.age && (
                        <p className="text-sm text-muted-foreground">
                          Age: {patient.age} • {patient.gender || 'Unknown'}
                        </p>
                      )}
                    </div>
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No patients found</p>
                <p className="text-sm">Try searching with different terms</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedPatient ? selectedPatient.name : 'Patient Details'}
                </CardTitle>
                <CardDescription>
                  {selectedPatient 
                    ? `Medical records and AI analysis for ${selectedPatient.name}`
                    : 'Select a patient to view their details'
                  }
                </CardDescription>
              </div>
              {selectedPatient && (
                <div className="flex items-center">
                  {!geminiKey ? (
                    <GeminiAPIKeyModal onKeySubmitted={handleGeminiKeySubmit} />
                  ) : (
                    <Button 
                      onClick={() => performAIAnalysis()} 
                      disabled={analysisLoading || !medicalRecords.length}
                      variant="outline"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {analysisLoading ? 'Analyzing...' : 'AI Analysis'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedPatient ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="records">Medical Records</TabsTrigger>
                  {aiAnalysis && <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Patient ID</Label>
                      <p className="font-medium">{selectedPatient.patient_id}</p>
                    </div>
                    <div>
                      <Label>Age & Gender</Label>
                      <p className="font-medium">
                        {selectedPatient.age || 'Unknown'} • {selectedPatient.gender || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="font-medium">{selectedPatient.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label>Blood Type</Label>
                      <p className="font-medium">{selectedPatient.blood_type || 'Unknown'}</p>
                    </div>
                  </div>

                  {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                    <div>
                      <Label>Allergies</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedPatient.allergies.map((allergy, idx) => (
                          <Badge key={idx} variant="destructive">{allergy}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPatient.chronic_conditions && selectedPatient.chronic_conditions.length > 0 && (
                    <div>
                      <Label>Chronic Conditions</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedPatient.chronic_conditions.map((condition, idx) => (
                          <Badge key={idx} variant="secondary">{condition}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="records" className="space-y-4">
                  {medicalRecords.length > 0 ? (
                    medicalRecords.map((record) => (
                      <Card key={record.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{record.visit_type}</Badge>
                                {record.severity_level && (
                                  <Badge variant={getSeverityColor(record.severity_level)}>
                                    {record.severity_level}
                                  </Badge>
                                )}
                                <Badge variant={record.status === 'active' ? 'default' : 'secondary'}>
                                  {record.status}
                                </Badge>
                              </div>
                              <p className="font-medium">{record.diagnosis || 'No diagnosis provided'}</p>
                              <p className="text-sm text-muted-foreground">
                                {record.hospitals.name} • {new Date(record.visit_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {record.symptoms && record.symptoms.length > 0 && (
                            <div className="mb-3">
                              <Label className="text-sm">Symptoms</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {record.symptoms.map((symptom, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {symptom}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {record.treatment && (
                            <div>
                              <Label className="text-sm">Treatment</Label>
                              <p className="text-sm mt-1">{record.treatment}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No medical records found</p>
                    </div>
                  )}
                </TabsContent>

                {aiAnalysis && (
                  <TabsContent value="ai-analysis" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Brain className="w-5 h-5 mr-2" />
                          AI Analysis Results
                        </CardTitle>
                        <CardDescription>
                          Gemini AI analysis of patient data and medical history
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Risk Assessment</Label>
                          <Badge variant={getSeverityColor(aiAnalysis.riskLevel)} className="ml-2">
                            {aiAnalysis.riskLevel}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Confidence: {(aiAnalysis.confidence * 100).toFixed(1)}%
                          </p>
                        </div>

                        {aiAnalysis.emergencyConditions?.length > 0 && (
                          <div>
                            <Label>Emergency Conditions to Monitor</Label>
                            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                              {aiAnalysis.emergencyConditions.map((condition: string, idx: number) => (
                                <li key={idx}>{condition}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiAnalysis.medicalPatterns?.length > 0 && (
                          <div>
                            <Label>Medical History Patterns</Label>
                            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                              {aiAnalysis.medicalPatterns.map((pattern: string, idx: number) => (
                                <li key={idx}>{pattern}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiAnalysis.immediateActions?.length > 0 && (
                          <div>
                            <Label>Recommended Immediate Actions</Label>
                            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                              {aiAnalysis.immediateActions.map((action: string, idx: number) => (
                                <li key={idx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiAnalysis.specialistReferrals?.length > 0 && (
                          <div>
                            <Label>Specialist Referrals</Label>
                            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                              {aiAnalysis.specialistReferrals.map((referral: string, idx: number) => (
                                <li key={idx}>{referral}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a Patient</p>
                <p className="text-sm">Choose a patient from the search results to view their details and medical records</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PatientSearch;