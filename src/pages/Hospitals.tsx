import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Plus, MapPin, Phone, Bed, Users, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  emergency_contact: string;
  bed_capacity: number;
  available_beds: number;
  specialties?: string[];
  status: string;
  latitude?: number;
  longitude?: number;
}

interface Department {
  id: string;
  hospital_id: string;
  name: string;
  head_doctor?: string;
  phone?: string;
  bed_count: number;
  available_beds: number;
  equipment?: string[];
  status: string;
}

const HospitalModal: React.FC<{ hospital?: Hospital; onSave: () => void }> = ({ hospital, onSave }) => {
  const [formData, setFormData] = useState({
    name: hospital?.name || '',
    address: hospital?.address || '',
    phone: hospital?.phone || '',
    email: hospital?.email || '',
    emergency_contact: hospital?.emergency_contact || '',
    bed_capacity: hospital?.bed_capacity || 0,
    available_beds: hospital?.available_beds || 0,
    specialties: hospital?.specialties?.join(', ') || '',
    status: hospital?.status || 'active'
  });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const hospitalData = {
        ...formData,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s)
      };

      if (hospital) {
        const { error } = await supabase
          .from('hospitals')
          .update(hospitalData)
          .eq('id', hospital.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hospitals')
          .insert([hospitalData]);
        if (error) throw error;
      }

      toast({
        title: hospital ? "Hospital Updated" : "Hospital Created",
        description: hospital ? "Hospital information updated successfully" : "New hospital added to the system",
      });

      setOpen(false);
      onSave();
    } catch (error: any) {
      console.error('Error saving hospital:', error);
      toast({
        title: "Error",
        description: "Failed to save hospital information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {hospital ? (
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Hospital
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{hospital ? 'Edit Hospital' : 'Add New Hospital'}</DialogTitle>
          <DialogDescription>
            {hospital ? 'Update hospital information' : 'Enter details for the new hospital'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Hospital Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="emergency_contact">Emergency Contact</Label>
            <Input
              id="emergency_contact"
              value={formData.emergency_contact}
              onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bed_capacity">Bed Capacity</Label>
              <Input
                id="bed_capacity"
                type="number"
                value={formData.bed_capacity}
                onChange={(e) => setFormData({...formData, bed_capacity: parseInt(e.target.value) || 0})}
                required
              />
            </div>
            <div>
              <Label htmlFor="available_beds">Available Beds</Label>
              <Input
                id="available_beds"
                type="number"
                value={formData.available_beds}
                onChange={(e) => setFormData({...formData, available_beds: parseInt(e.target.value) || 0})}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="specialties">Specialties (comma-separated)</Label>
            <Input
              id="specialties"
              value={formData.specialties}
              onChange={(e) => setFormData({...formData, specialties: e.target.value})}
              placeholder="Cardiology, Emergency Medicine, ICU"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : hospital ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Hospitals = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name');

      if (error) throw error;
      setHospitals(data || []);
    } catch (error: any) {
      console.error('Error fetching hospitals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch hospitals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch departments",
        variant: "destructive",
      });
    }
  };

  const deleteHospital = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hospital? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Hospital Deleted",
        description: "Hospital has been removed from the system",
      });
      
      fetchHospitals();
    } catch (error: any) {
      console.error('Error deleting hospital:', error);
      toast({
        title: "Error",
        description: "Failed to delete hospital",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string, availableBeds?: number, totalBeds?: number) => {
    if (status !== 'active') return 'destructive';
    
    if (availableBeds !== undefined && totalBeds !== undefined) {
      const occupancyRate = ((totalBeds - availableBeds) / totalBeds) * 100;
      if (occupancyRate >= 90) return 'destructive';
      if (occupancyRate >= 75) return 'secondary';
    }
    
    return 'default';
  };

  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading hospitals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hospital Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage hospitals, departments, and bed availability
          </p>
        </div>
        <HospitalModal onSave={fetchHospitals} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Hospitals</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by hospital name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHospitals.map((hospital) => (
              <Card key={hospital.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{hospital.name}</CardTitle>
                    <Badge variant={getStatusColor(hospital.status, hospital.available_beds, hospital.bed_capacity)}>
                      {hospital.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>{hospital.address}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{hospital.emergency_contact}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bed className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {hospital.available_beds}/{hospital.bed_capacity} beds available
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: `${Math.max(0, (hospital.available_beds / hospital.bed_capacity) * 100)}%` 
                      }}
                    ></div>
                  </div>

                  {hospital.specialties && hospital.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hospital.specialties.slice(0, 3).map((specialty, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {hospital.specialties.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{hospital.specialties.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHospital(hospital);
                        fetchDepartments(hospital.id);
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      View Departments
                    </Button>
                    <div className="flex space-x-1">
                      <HospitalModal hospital={hospital} onSave={fetchHospitals} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteHospital(hospital.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedHospital ? `${selectedHospital.name} Departments` : 'Hospital Departments'}
            </CardTitle>
            <CardDescription>
              {selectedHospital 
                ? 'Department breakdown and bed availability'
                : 'Select a hospital to view its departments'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedHospital ? (
              <div className="space-y-3">
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <Card key={dept.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{dept.name}</h4>
                          <Badge variant={dept.status === 'active' ? 'default' : 'secondary'}>
                            {dept.status}
                          </Badge>
                        </div>
                        
                        {dept.head_doctor && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Head: {dept.head_doctor}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Beds Available</span>
                          <span className="font-medium">
                            {dept.available_beds}/{dept.bed_count}
                          </span>
                        </div>

                        <div className="w-full bg-secondary rounded-full h-1 mt-2">
                          <div 
                            className="bg-primary h-1 rounded-full" 
                            style={{ 
                              width: `${Math.max(0, (dept.available_beds / dept.bed_count) * 100)}%` 
                            }}
                          ></div>
                        </div>

                        {dept.equipment && dept.equipment.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Equipment:</p>
                            <div className="flex flex-wrap gap-1">
                              {dept.equipment.slice(0, 2).map((eq, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {eq}
                                </Badge>
                              ))}
                              {dept.equipment.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{dept.equipment.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No departments found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a Hospital</p>
                <p className="text-sm">Choose a hospital to view its departments and bed availability</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Hospitals;