import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, User, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PatientModalProps {
  onPatientCreated?: (patient: any) => void;
}

export const PatientModal: React.FC<PatientModalProps> = ({ onPatientCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Patient form data
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    blood_type: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    patient_id: `PAT-${Date.now()}`,
  });

  // Medical record data
  const [medicalData, setMedicalData] = useState({
    diagnosis: '',
    symptoms: '',
    treatment: '',
    visit_type: 'emergency',
    severity_level: 'medium',
    notes: '',
  });

  // Arrays for allergies and chronic conditions
  const [allergies, setAllergies] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [currentAllergy, setCurrentAllergy] = useState('');
  const [currentCondition, setCurrentCondition] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMedicalChange = (field: string, value: string) => {
    setMedicalData(prev => ({ ...prev, [field]: value }));
  };

  const addAllergy = () => {
    if (currentAllergy.trim() && !allergies.includes(currentAllergy.trim())) {
      setAllergies(prev => [...prev, currentAllergy.trim()]);
      setCurrentAllergy('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setAllergies(prev => prev.filter(a => a !== allergy));
  };

  const addChronicCondition = () => {
    if (currentCondition.trim() && !chronicConditions.includes(currentCondition.trim())) {
      setChronicConditions(prev => [...prev, currentCondition.trim()]);
      setCurrentCondition('');
    }
  };

  const removeChronicCondition = (condition: string) => {
    setChronicConditions(prev => prev.filter(c => c !== condition));
  };

  const searchExistingPatients = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,patient_id.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error searching patients:', error);
      toast({
        title: "Search Error",
        description: "Failed to search existing patients",
        variant: "destructive",
      });
    }
  };

  const selectExistingPatient = (patient: any) => {
    setFormData({
      name: patient.name,
      age: patient.age?.toString() || '',
      gender: patient.gender || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      blood_type: patient.blood_type || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      patient_id: patient.patient_id,
    });
    setAllergies(patient.allergies || []);
    setChronicConditions(patient.chronic_conditions || []);
    setSearchMode(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if patient already exists
      let patientId: string;
      const { data: existingPatients, error: searchError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', formData.patient_id);

      if (searchError) throw searchError;

      if (existingPatients && existingPatients.length > 0) {
        // Use existing patient
        patientId = existingPatients[0].id;
      } else {
        // Create new patient
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert([{
            ...formData,
            age: formData.age ? parseInt(formData.age) : null,
            allergies: allergies.length > 0 ? allergies : null,
            chronic_conditions: chronicConditions.length > 0 ? chronicConditions : null,
          }])
          .select()
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;
      }

      // Get first hospital for the medical record
      const { data: hospitals, error: hospitalError } = await supabase
        .from('hospitals')
        .select('id')
        .limit(1);

      if (hospitalError) throw hospitalError;

      if (!hospitals || hospitals.length === 0) {
        throw new Error('No hospitals found. Please add a hospital first.');
      }

      // Create medical record if diagnosis is provided
      if (medicalData.diagnosis.trim()) {
        const { error: recordError } = await supabase
          .from('medical_records')
          .insert([{
            patient_id: patientId,
            hospital_id: hospitals[0].id,
            diagnosis: medicalData.diagnosis,
            symptoms: medicalData.symptoms ? medicalData.symptoms.split(',').map(s => s.trim()) : null,
            treatment: medicalData.treatment || null,
            visit_type: medicalData.visit_type,
            severity_level: medicalData.severity_level,
            notes: medicalData.notes || null,
            visit_date: new Date().toISOString(),
          }]);

        if (recordError) throw recordError;
      }

      toast({
        title: "Success",
        description: "Patient and medical record created successfully",
      });

      // Reset form
      setFormData({
        name: '',
        age: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        blood_type: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        patient_id: `PAT-${Date.now()}`,
      });
      setMedicalData({
        diagnosis: '',
        symptoms: '',
        treatment: '',
        visit_type: 'emergency',
        severity_level: 'medium',
        notes: '',
      });
      setAllergies([]);
      setChronicConditions([]);
      setOpen(false);

      if (onPatientCreated) {
        onPatientCreated({ id: patientId, ...formData });
      }

    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create patient record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient & Medical Record</DialogTitle>
          <DialogDescription>
            Create a new patient record with initial medical information or search for existing patients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant={searchMode ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMode(!searchMode)}
            >
              <Search className="w-4 h-4 mr-2" />
              Search Existing
            </Button>
          </div>

          {/* Search Section */}
          {searchMode && (
            <Card>
              <CardHeader>
                <CardTitle>Search Existing Patients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search by name, ID, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchExistingPatients()}
                  />
                  <Button onClick={searchExistingPatients}>Search</Button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((patient) => (
                      <div
                        key={patient.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => selectExistingPatient(patient)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {patient.patient_id} • {patient.age ? `Age: ${patient.age}` : 'Age: Unknown'}
                            </p>
                          </div>
                          <User className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="patient_id">Patient ID</Label>
                  <Input
                    id="patient_id"
                    value={formData.patient_id}
                    onChange={(e) => handleInputChange('patient_id', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="blood_type">Blood Type</Label>
                  <Select value={formData.blood_type} onValueChange={(value) => handleInputChange('blood_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Allergies and Chronic Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Medical History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Allergies */}
                <div>
                  <Label>Allergies</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      placeholder="Add allergy"
                      value={currentAllergy}
                      onChange={(e) => setCurrentAllergy(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                    />
                    <Button type="button" onClick={addAllergy} size="sm">Add</Button>
                  </div>
                  {allergies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {allergies.map((allergy) => (
                        <Badge key={allergy} variant="destructive" className="cursor-pointer" onClick={() => removeAllergy(allergy)}>
                          {allergy} <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chronic Conditions */}
                <div>
                  <Label>Chronic Conditions</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      placeholder="Add chronic condition"
                      value={currentCondition}
                      onChange={(e) => setCurrentCondition(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChronicCondition())}
                    />
                    <Button type="button" onClick={addChronicCondition} size="sm">Add</Button>
                  </div>
                  {chronicConditions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {chronicConditions.map((condition) => (
                        <Badge key={condition} variant="secondary" className="cursor-pointer" onClick={() => removeChronicCondition(condition)}>
                          {condition} <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Medical Record */}
            <Card>
              <CardHeader>
                <CardTitle>Initial Medical Record (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Input
                    id="diagnosis"
                    value={medicalData.diagnosis}
                    onChange={(e) => handleMedicalChange('diagnosis', e.target.value)}
                    placeholder="Enter diagnosis"
                  />
                </div>
                <div>
                  <Label htmlFor="visit_type">Visit Type</Label>
                  <Select value={medicalData.visit_type} onValueChange={(value) => handleMedicalChange('visit_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="outpatient">Outpatient</SelectItem>
                      <SelectItem value="inpatient">Inpatient</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="severity_level">Severity Level</Label>
                  <Select value={medicalData.severity_level} onValueChange={(value) => handleMedicalChange('severity_level', value)}>
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
                <div className="md:col-span-2">
                  <Label htmlFor="symptoms">Symptoms (comma-separated)</Label>
                  <Input
                    id="symptoms"
                    value={medicalData.symptoms}
                    onChange={(e) => handleMedicalChange('symptoms', e.target.value)}
                    placeholder="fever, headache, nausea"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="treatment">Treatment</Label>
                  <Textarea
                    id="treatment"
                    value={medicalData.treatment}
                    onChange={(e) => handleMedicalChange('treatment', e.target.value)}
                    placeholder="Describe treatment plan"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={medicalData.notes}
                    onChange={(e) => handleMedicalChange('notes', e.target.value)}
                    placeholder="Additional notes"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Patient'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};