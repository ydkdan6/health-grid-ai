-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  emergency_contact TEXT NOT NULL,
  bed_capacity INTEGER NOT NULL DEFAULT 0,
  available_beds INTEGER NOT NULL DEFAULT 0,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  head_doctor TEXT,
  phone TEXT,
  bed_count INTEGER DEFAULT 0,
  available_beds INTEGER DEFAULT 0,
  equipment TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practitioners table
CREATE TABLE public.practitioners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialization TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  experience_years INTEGER,
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'off_duty')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_type TEXT,
  allergies TEXT[],
  chronic_conditions TEXT[],
  insurance_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medical_records table
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('emergency', 'routine', 'follow_up', 'consultation')),
  diagnosis TEXT,
  symptoms TEXT[],
  treatment TEXT,
  medications JSONB,
  test_results JSONB,
  vital_signs JSONB,
  notes TEXT,
  severity_level TEXT CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  discharge_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency_alerts table
CREATE TABLE public.emergency_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('bed_shortage', 'equipment_failure', 'staff_shortage', 'patient_emergency', 'disaster')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
  created_by UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for hospitals (accessible to authenticated users)
CREATE POLICY "Hospitals are viewable by authenticated users" 
ON public.hospitals 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Hospitals can be managed by authenticated users" 
ON public.hospitals 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for departments
CREATE POLICY "Departments are viewable by authenticated users" 
ON public.departments 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Departments can be managed by authenticated users" 
ON public.departments 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for practitioners
CREATE POLICY "Practitioners are viewable by authenticated users" 
ON public.practitioners 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Practitioners can be managed by authenticated users" 
ON public.practitioners 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for patients
CREATE POLICY "Patients are viewable by authenticated users" 
ON public.patients 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Patients can be managed by authenticated users" 
ON public.patients 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for medical records
CREATE POLICY "Medical records are viewable by authenticated users" 
ON public.medical_records 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Medical records can be managed by authenticated users" 
ON public.medical_records 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create policies for emergency alerts
CREATE POLICY "Emergency alerts are viewable by authenticated users" 
ON public.emergency_alerts 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Emergency alerts can be managed by authenticated users" 
ON public.emergency_alerts 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_patients_patient_id ON public.patients(patient_id);
CREATE INDEX idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX idx_medical_records_hospital_id ON public.medical_records(hospital_id);
CREATE INDEX idx_medical_records_visit_date ON public.medical_records(visit_date);
CREATE INDEX idx_emergency_alerts_hospital_id ON public.emergency_alerts(hospital_id);
CREATE INDEX idx_emergency_alerts_severity ON public.emergency_alerts(severity);
CREATE INDEX idx_emergency_alerts_status ON public.emergency_alerts(status);
CREATE INDEX idx_practitioners_hospital_id ON public.practitioners(hospital_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_hospitals_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practitioners_updated_at
  BEFORE UPDATE ON public.practitioners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_alerts_updated_at
  BEFORE UPDATE ON public.emergency_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();