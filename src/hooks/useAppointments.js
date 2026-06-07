// src/hooks/useAppointments.js

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { sendAppointmentConfirmation, sendAdminApptAlert } from '../lib/whatsapp';

/* ─────────────────────────────────────────────────────────────
   useBookAppointment  — used in AppointmentBooking.jsx
───────────────────────────────────────────────────────────── */
export const useBookAppointment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const book = async (form) => {
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        patient_id:     user?.id ?? null,
        patient_name:   form.name,
        patient_phone:  form.phone,
        patient_email:  form.email,
        patient_age:    form.age ? parseInt(form.age) : null,
        patient_gender: form.gender,
        doctor_name:    form.doctor,
        service:        form.service,
        date:           form.date,
        time_slot:      form.slot,
        consult_type:   form.consultType,
        notes:          form.notes,
        status:         'pending',
      }])
      .select()
      .single();

    setLoading(false);
    if (error) { setError(error.message); return { error }; }

    // Notify admin of new appointment (non-blocking)
    const dateObj  = new Date(`${form.date}T00:00:00`);
    const dateStr  = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    sendAdminApptAlert({
      patientName: form.name,
      phone:       form.phone,
      doctorName:  form.doctor,
      dateTime:    `${dateStr}, ${form.slot}`,
    });

    return { data };
  };

  return { book, loading, error };
};


/* ─────────────────────────────────────────────────────────────
   useAllAppointments  — used in AdminDashboard.jsx
───────────────────────────────────────────────────────────── */
export const useAllAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('date',      { ascending: true })
      .order('time_slot', { ascending: true });

    if (error) setError(error.message);
    else       setAppointments(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateStatus = async (id, status) => {
    // Capture the record BEFORE any state change
    const appt = appointments.find(a => a.id === id);

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

      // Send WA confirmation when admin sets status → "confirmed"
      if (status === 'confirmed' && appt?.patient_phone) {
        sendAppointmentConfirmation(appt.patient_phone, {
          patientName: appt.patient_name,
          doctorName:  appt.doctor_name,
          date:        appt.date,
          time:        appt.time_slot,
          consultType: appt.consult_type,
        });
      }
    }
    return { error };
  };

  const deleteAppointment = async (id) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) setAppointments(prev => prev.filter(a => a.id !== id));
    return { error };
  };

  return { appointments, loading, error, updateStatus, deleteAppointment, refetch: fetchAll };
};


/* ─────────────────────────────────────────────────────────────
   useMyAppointments  — used in PatientDashboard / History
───────────────────────────────────────────────────────────── */
export const useMyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', user.id)
        .order('date', { ascending: false });

      if (!error) setAppointments(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const cancelAppointment = (id) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
  };

  return { appointments, loading, cancelAppointment };
};


/* ─────────────────────────────────────────────────────────────
   useDoctorAppointments  — available for DoctorDashboard if needed
───────────────────────────────────────────────────────────── */
export const useDoctorAppointments = (doctorName) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);

  const fetchDoctor = useCallback(async () => {
    if (!doctorName) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_name', doctorName)
      .order('date', { ascending: true });

    if (!error) setAppointments(data);
    setLoading(false);
  }, [doctorName]);

  useEffect(() => { fetchDoctor(); }, [fetchDoctor]);

  const updateStatus = async (id, status) => {
    const appt = appointments.find(a => a.id === id);

    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

      if (status === 'confirmed' && appt?.patient_phone) {
        sendAppointmentConfirmation(appt.patient_phone, {
          patientName: appt.patient_name,
          doctorName:  appt.doctor_name,
          date:        appt.date,
          time:        appt.time_slot,
          consultType: appt.consult_type,
        });
      }
    }
    return { error };
  };

  return { appointments, loading, updateStatus, refetch: fetchDoctor };
};
