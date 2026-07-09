// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import SoloDoctorDashboard from '../pages/SoloDoctorDashboard';

const navigateMock = vi.fn();
const logoutMock = vi.fn();
const toastMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'doctor-1', role: 'separate_doctor' },
    logout: logoutMock,
  }),
}));

vi.mock('../components/Toast', () => ({
  Toast: () => null,
  useToast: () => toastMock,
}));

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { doctor: {}, appointments: [], prescriptions: [] } })),
    patch: vi.fn(() => Promise.resolve({ data: { success: true } })),
    put: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

describe('SoloDoctorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    logoutMock.mockReset();
  });

  it('uses the authenticated user for the separate-doctor dashboard instead of redirecting home', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <MemoryRouter>
          <SoloDoctorDashboard />
        </MemoryRouter>
      );
      await Promise.resolve();
    });

    expect(navigateMock).not.toHaveBeenCalledWith('/');
    container.remove();
  });

  it('defaults to inactive and surfaces a status-not-found message when the doctor status lookup fails', async () => {
    const api = await import('../utils/api');
    api.default.get.mockRejectedValueOnce({ response: { data: { message: 'Doctor status not found' } } });

    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container);
      root.render(
        <MemoryRouter>
          <SoloDoctorDashboard />
        </MemoryRouter>
      );
      await Promise.resolve();
    });

    expect(toastMock).toHaveBeenCalledWith('Doctor status not found', 'error');
    container.remove();
  });
});
