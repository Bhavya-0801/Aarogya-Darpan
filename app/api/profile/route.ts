import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'
import { generateUHID } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function normalizePatientProfile(patient: any) {
  if (!patient) return null
  const user = patient.user || {}
  return {
    ...patient,
    _id: patient.id,
    userId: {
      ...user,
      _id: user.id || patient.user_id,
    },
    user: {
      ...user,
      _id: user.id || patient.user_id,
    },
    bloodGroup: patient.blood_group || '',
    chronicConditions: patient.chronic_conditions || [],
    emergencyContact: {
      name: patient.emergency_name || '',
      relation: patient.emergency_relation || '',
      phone: patient.emergency_phone || '',
    },
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (token as any).id
    const role = (token as any).role

    if (role !== 'patient') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, name, email, phone, role, specialization, department, opd_fee, hospital_id')
        .eq('id', userId)
        .single()

      return NextResponse.json({
        profile: null,
        user: user ? { ...user, _id: user.id, opdFee: user.opd_fee, hospitalId: user.hospital_id } : null,
      })
    }

    let { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*, user:users(id, name, email, phone, role)')
      .eq('user_id', userId)
      .single()

    // Auto-provision patient record if missing so patient profile never errors out
    if (!patient) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, name, email, phone, role')
        .eq('id', userId)
        .single()

      const uhid = generateUHID()
      const { data: newPatient } = await supabaseAdmin
        .from('patients')
        .insert({
          user_id: userId,
          uhid,
          dob: '2000-01-01',
          gender: 'Other',
          allergies: [],
          chronic_conditions: [],
        })
        .select('*')
        .single()

      if (newPatient) {
        patient = { ...newPatient, user: userData }
      }
    }

    return NextResponse.json({ profile: normalizePatientProfile(patient) })
  } catch (err: any) {
    console.error('[Profile GET Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (token as any).id
    const role = (token as any).role
    const body = await req.json()
    const { name, phone, allergies, chronicConditions, emergencyContact, bloodGroup, address } = body

    if (name || phone) {
      await supabaseAdmin
        .from('users')
        .update({ ...(name && { name }), ...(phone && { phone }) })
        .eq('id', userId)
    }

    if (role !== 'patient') {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, name, email, phone, role, specialization, department, opd_fee, hospital_id')
        .eq('id', userId)
        .single()

      return NextResponse.json({
        profile: null,
        user: user ? { ...user, _id: user.id, opdFee: user.opd_fee, hospitalId: user.hospital_id } : null,
      })
    }

    const updateFields: any = {}
    if (allergies !== undefined) updateFields.allergies = allergies
    if (chronicConditions !== undefined) updateFields.chronic_conditions = chronicConditions
    if (bloodGroup !== undefined) updateFields.blood_group = bloodGroup
    if (address !== undefined) updateFields.address = address
    if (emergencyContact !== undefined) {
      updateFields.emergency_name = emergencyContact.name || ''
      updateFields.emergency_relation = emergencyContact.relation || ''
      updateFields.emergency_phone = emergencyContact.phone || ''
    }

    const { data: updatedPatient } = await supabaseAdmin
      .from('patients')
      .update(updateFields)
      .eq('user_id', userId)
      .select('*, user:users(id, name, email, phone, role)')
      .single()

    return NextResponse.json({ profile: normalizePatientProfile(updatedPatient) })
  } catch (err: any) {
    console.error('[Profile PATCH Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
