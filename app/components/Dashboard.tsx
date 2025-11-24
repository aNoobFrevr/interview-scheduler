'use client';

import useSWR, { mutate } from 'swr';
import { useMemo, useState } from 'react';
import { Booking, Candidate, Coordinator, Interviewer, Slot } from '@/lib/types';

const fetcher = async (url: string, role?: string, init?: RequestInit) => {
  const baseHeaders = init?.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : init?.headers;
  const res = await fetch(url, {
    ...init,
    headers: role ? { ...baseHeaders, 'X-User-Role': role } : baseHeaders
  });
  if (!res.ok) {
    const payload = await res.json();
    throw new Error(payload.message || 'Request failed');
  }
  return res.json();
};

interface SlotsResponse {
  slots: Slot[];
  people: {
    interviewers: Interviewer[];
    coordinators: Coordinator[];
    candidates: Candidate[];
  };
}

export default function Dashboard() {
  const [interviewerId, setInterviewerId] = useState<string>('i-1');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const { data: slotsResponse } = useSWR<SlotsResponse>('/api/slots', (url) => fetcher(url));
  const { data: calendarResponse } = useSWR<{ calendar: { booking: Booking; slot: Slot; candidate?: Candidate }[] }>(
    `/api/calendar?interviewerId=${interviewerId}`,
    fetcher
  );

  const people = slotsResponse?.people;
  const availableSlots = useMemo(() => slotsResponse?.slots.filter((slot) => slot.status === 'available') ?? [], [
    slotsResponse
  ]);

  async function handleCreateSlot(formData: FormData) {
    setStatusMessage('');
    const payload = {
      interviewerId: formData.get('interviewerId') as string,
      startTime: new Date(formData.get('startTime') as string).toISOString(),
      endTime: new Date(formData.get('endTime') as string).toISOString(),
      location: formData.get('location') as string
    };
    try {
      await fetcher('/api/slots', 'Interviewer', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      mutate('/api/slots');
      setStatusMessage('Slot created successfully');
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  }

  async function handleBookSlot(formData: FormData) {
    setStatusMessage('');
    const payload = {
      slotId: formData.get('slotId') as string,
      candidateId: formData.get('candidateId') as string,
      coordinatorId: formData.get('coordinatorId') as string
    };
    try {
      await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': 'Coordinator' },
        body: JSON.stringify(payload)
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      });
      mutate('/api/slots');
      mutate(`/api/calendar?interviewerId=${interviewerId}`);
      setStatusMessage('Booking confirmed');
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  }

  async function handleReschedule(formData: FormData) {
    setStatusMessage('');
    const payload = {
      bookingId: formData.get('bookingId') as string,
      newSlotId: formData.get('newSlotId') as string,
      coordinatorId: formData.get('coordinatorId') as string
    };
    try {
      await fetch('/api/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': 'Coordinator' },
        body: JSON.stringify(payload)
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      });
      mutate('/api/slots');
      mutate(`/api/calendar?interviewerId=${interviewerId}`);
      setStatusMessage('Booking moved to the selected slot');
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  }

  const currentBookings = calendarResponse?.calendar ?? [];

  return (
    <main>
      <h1>Interview Scheduling Scaffold</h1>
      {statusMessage ? <p className="pill">{statusMessage}</p> : null}

      <section>
        <h2>Interviewer dashboard</h2>
        <p className="muted">Create availability and review your slots.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateSlot(new FormData(event.currentTarget));
          }}
        >
          <label>
            Interviewer
            <select name="interviewerId" defaultValue={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}>
              {people?.interviewers.map((interviewer) => (
                <option key={interviewer.id} value={interviewer.id}>
                  {interviewer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start time
            <input name="startTime" type="datetime-local" required />
          </label>
          <label>
            End time
            <input name="endTime" type="datetime-local" required />
          </label>
          <label>
            Location
            <input name="location" placeholder="Zoom / Onsite" required />
          </label>
          <button type="submit">Create slot</button>
        </form>

        <div className="card-grid" style={{ marginTop: '1rem' }}>
          {slotsResponse?.slots.map((slot) => (
            <div key={slot.id} className="card">
              <div className={`badge ${slot.status}`}>{slot.status}</div>
              <h3 style={{ marginBottom: '0.35rem' }}>{slot.location}</h3>
              <p className="muted">
                {new Date(slot.startTime).toLocaleString()} – {new Date(slot.endTime).toLocaleTimeString()}
              </p>
              <p className="muted">Interviewer: {people?.interviewers.find((i) => i.id === slot.interviewerId)?.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Coordinator dashboard</h2>
        <p className="muted">Book or reschedule on behalf of candidates with in-memory data.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleBookSlot(new FormData(event.currentTarget));
          }}
        >
          <label>
            Slot
            <select name="slotId" required>
              <option value="">Select available slot</option>
              {availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {new Date(slot.startTime).toLocaleString()} – {people?.interviewers.find((i) => i.id === slot.interviewerId)?.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Candidate
            <select name="candidateId" required>
              <option value="">Pick candidate</option>
              {people?.candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.email})
                </option>
              ))}
            </select>
          </label>
          <label>
            Coordinator
            <select name="coordinatorId" required>
              {people?.coordinators.map((coord) => (
                <option key={coord.id} value={coord.id}>
                  {coord.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Book slot</button>
        </form>

        <h3 style={{ marginTop: '1.5rem' }}>Reschedule existing booking</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleReschedule(new FormData(event.currentTarget));
          }}
        >
          <label>
            Booking
            <select name="bookingId" required>
              <option value="">Select booking</option>
              {currentBookings.map(({ booking, slot, candidate }) => (
                <option key={booking.id} value={booking.id}>
                  {candidate?.name} with {people?.interviewers.find((i) => i.id === slot.interviewerId)?.name} on{' '}
                  {new Date(slot.startTime).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <label>
            New slot
            <select name="newSlotId" required>
              <option value="">Select available slot</option>
              {availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {new Date(slot.startTime).toLocaleString()} – {people?.interviewers.find((i) => i.id === slot.interviewerId)?.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Coordinator
            <select name="coordinatorId" required>
              {people?.coordinators.map((coord) => (
                <option key={coord.id} value={coord.id}>
                  {coord.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Reschedule</button>
        </form>
      </section>

      <section>
        <h2>Calendar preview</h2>
        <p className="muted">Shows confirmed bookings for the selected interviewer.</p>
        <div className="inline-actions" style={{ marginBottom: '1rem' }}>
          <label>
            Interviewer
            <select value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}>
              {people?.interviewers.map((interviewer) => (
                <option key={interviewer.id} value={interviewer.id}>
                  {interviewer.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => mutate(`/api/calendar?interviewerId=${interviewerId}`)}>Refresh</button>
        </div>
        <table className="table-like">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Slot</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {currentBookings.map(({ booking, slot, candidate }) => (
              <tr key={booking.id}>
                <td>{candidate?.name ?? 'Unknown candidate'}</td>
                <td>
                  {new Date(slot.startTime).toLocaleString()} — {new Date(slot.endTime).toLocaleTimeString()}
                </td>
                <td>{slot.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
