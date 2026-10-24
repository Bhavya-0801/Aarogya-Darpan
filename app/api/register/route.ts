import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { generateUHID } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, email, password, role, phone,
      // Hospital admin
      hospitalName, hospitalCity, hospitalState, hospitalStreet, hospitalPincode,
      hospitalLicenseNo, hospitalPhone,
      // Patient
      dob, gender,
      // Doctor / Staff
      hospitalId, specialization, department, opdFee,
      labDepartment,
    } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check email uniqueness
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // ===== HOSPITAL ADMIN =====
    if (role === 'hospital_admin') {
      if (!hospitalName || !hospitalCity || !hospitalState) {
        return NextResponse.json({ error: 'Hospital name, city, and state are required' }, { status: 400 })
      }

      // Create user first
      const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .insert({ name, email: email.toLowerCase(), password_hash: passwordHash, role, phone: phone || '' })
        .select()
        .single()

      if (userErr || !user) throw userErr || new Error('Failed to create user')

      // Create hospital
      const { data: hospital, error: hospErr } = await supabaseAdmin
        .from('hospitals')
        .insert({
          name: hospitalName,
          street: hospitalStreet || '',
          city: hospitalCity,
          state: hospitalState,
          pincode: hospitalPincode || '',
          phone: hospitalPhone || phone || '',
          email: email.toLowerCase(),
          license_number: hospitalLicenseNo || null,
          admin_id: user.id,
          departments: ['General Medicine', 'Emergency'],
          total_beds: 0,
        })
        .select()
        .single()

      if (hospErr || !hospital) throw hospErr || new Error('Failed to create hospital')

      // Link hospital back to user
      await supabaseAdmin.from('users').update({ hospital_id: hospital.id }).eq('id', user.id)

      return NextResponse.json({ message: 'Hospital admin registered successfully' }, { status: 201 })
    }

    // ===== PATIENT =====
    if (role === 'patient') {
      if (!dob || !gender) {
        return NextResponse.json({ error: 'Date of birth and gender required' }, { status: 400 })
      }

      const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .insert({ name, email: email.toLowerCase(), password_hash: passwordHash, role, phone: phone || '' })
        .select()
        .single()

      if (userErr || !user) throw userErr || new Error('Failed to create user')

      const { error: patErr } = await supabaseAdmin
        .from('patients')
        .insert({
          user_id: user.id,
          uhid: generateUHID(),
          dob,
          gender,
          allergies: [],
          chronic_conditions: [],
        })

      if (patErr) throw patErr

      return NextResponse.json({ message: 'Patient registered successfully' }, { status: 201 })
    }

    // ===== DOCTOR =====
    if (role === 'doctor') {
      const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .insert({
          name, email: email.toLowerCase(), password_hash: passwordHash, role, phone: phone || '',
          hospital_id: hospitalId || null,
          specialization: specialization || '',
          department: department || '',
          opd_fee: Number(opdFee) || 300,
        })
        .select()
        .single()

      if (userErr || !user) throw userErr || new Error('Failed to create doctor')
      return NextResponse.json({ message: 'Doctor registered successfully', userId: user.id }, { status: 201 })
    }

    // ===== PHARMACY =====
    if (role === 'pharmacy') {
      const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .insert({ name, email: email.toLowerCase(), password_hash: passwordHash, role, phone: phone || '', hospital_id: hospitalId || null })
        .select()
        .single()

      if (userErr || !user) throw userErr || new Error('Failed to create pharmacy user')
      return NextResponse.json({ message: 'Pharmacy registered successfully', userId: user.id }, { status: 201 })
    }

    // ===== RECEPTIONIST / LAB TECHNICIAN =====
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .insert({
        name, email: email.toLowerCase(), password_hash: passwordHash, role, phone: phone || '',
        hospital_id: hospitalId || null,
        department: labDepartment || department || '',
      })
      .select()
      .single()

    if (userErr || !user) throw userErr || new Error('Failed to create user')
    return NextResponse.json({ message: 'Account registered successfully', userId: user.id }, { status: 201 })

  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
